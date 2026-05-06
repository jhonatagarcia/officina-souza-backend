import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialEntryType, FinancialStatus, Prisma } from '@prisma/client';
import { ClientsService } from 'src/clients/clients.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { getCurrentMonthRange } from 'src/common/utils/date-period.util';
import { buildSafeOrderBy } from 'src/common/utils/order-by.util';
import { buildPaginationMeta, PaginatedResponse } from 'src/common/utils/pagination.util';
import {
  FinancialEntryResponseDto,
  toFinancialEntryResponseDto,
} from 'src/financial/dto/financial-entry-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ServiceOrdersService } from 'src/service-orders/service-orders.service';
import { CreateFinancialEntryDto } from 'src/financial/dto/create-financial-entry.dto';
import { PayFinancialEntryDto } from 'src/financial/dto/pay-financial-entry.dto';
import { StockOutValueService } from 'src/financial/services/stock-out-value.service';
import { UpdateFinancialEntryDto } from 'src/financial/dto/update-financial-entry.dto';

const FINANCIAL_ORDERABLE_FIELDS = new Set(['dueDate', 'createdAt', 'amount', 'status'] as const);

@Injectable()
export class FinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
    private readonly serviceOrdersService: ServiceOrdersService,
    private readonly stockOutValueService: StockOutValueService,
  ) {}

  async create(
    createFinancialEntryDto: CreateFinancialEntryDto,
  ): Promise<FinancialEntryResponseDto> {
    await this.validateReferences(
      createFinancialEntryDto.clientId,
      createFinancialEntryDto.serviceOrderId,
    );

    const dueDate = new Date(createFinancialEntryDto.dueDate);
    const status = dueDate < new Date() ? FinancialStatus.VENCIDO : FinancialStatus.PENDENTE;

    const entry = await this.prisma.financialEntry.create({
      data: {
        type: createFinancialEntryDto.type,
        description: createFinancialEntryDto.description,
        category: createFinancialEntryDto.category,
        amount: createFinancialEntryDto.amount,
        paymentMethod: createFinancialEntryDto.paymentMethod,
        clientId: createFinancialEntryDto.clientId,
        serviceOrderId: createFinancialEntryDto.serviceOrderId,
        notes: createFinancialEntryDto.notes,
        dueDate,
        status,
      },
      include: { client: true, serviceOrder: true },
    });

    return toFinancialEntryResponseDto(entry);
  }

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<FinancialEntryResponseDto>> {
    await this.syncOverdueStatuses();

    const where: Prisma.FinancialEntryWhereInput = {
      ...(pagination.search
        ? {
            OR: [
              { description: { contains: pagination.search, mode: 'insensitive' } },
              { category: { contains: pagination.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(pagination.status ? { status: pagination.status as FinancialStatus } : {}),
      ...(pagination.type ? { type: pagination.type as FinancialEntryType } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.financialEntry.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: buildSafeOrderBy(
          FINANCIAL_ORDERABLE_FIELDS,
          pagination.sortBy,
          'createdAt',
          pagination.sortOrder,
        ),
        include: {
          client: true,
          serviceOrder: true,
        },
      }),
      this.prisma.financialEntry.count({ where }),
    ]);

    return {
      data: data.map(toFinancialEntryResponseDto),
      meta: buildPaginationMeta(pagination, total),
    };
  }

  async findOne(id: string): Promise<FinancialEntryResponseDto> {
    await this.syncOverdueStatuses();

    const entry = await this.prisma.financialEntry.findUnique({
      where: { id },
      include: { client: true, serviceOrder: true },
    });

    if (!entry) {
      throw new NotFoundException('Lancamento financeiro nao encontrado');
    }

    return toFinancialEntryResponseDto(entry);
  }

  async getSummary() {
    const currentMonth = getCurrentMonthRange();

    const [receivablesSummary, paidServiceOrders, unbilledPartsSummary] = await Promise.all([
      this.prisma.financialEntry.aggregate({
        _sum: { amount: true },
        where: {
          type: FinancialEntryType.RECEIVABLE,
          dueDate: { gte: currentMonth.start, lt: currentMonth.end },
        },
      }),
      this.prisma.serviceOrder.findMany({
        where: {
          financialEntries: {
            some: {
              type: FinancialEntryType.RECEIVABLE,
              status: FinancialStatus.PAGO,
            },
          },
        },
        include: {
          parts: {
            select: {
              quantity: true,
              inventoryItem: {
                select: {
                  cost: true,
                },
              },
            },
          },
          budget: {
            include: {
              items: {
                where: {
                  inventoryItemId: {
                    not: null,
                  },
                },
                select: {
                  quantity: true,
                  inventoryItem: {
                    select: {
                      cost: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.serviceOrderPart.aggregate({
        _sum: { totalPrice: true },
        where: {
          updatedAt: { gte: currentMonth.start, lt: currentMonth.end },
          serviceOrder: {
            financialEntries: {
              none: {
                type: FinancialEntryType.RECEIVABLE,
              },
            },
          },
        },
      }),
    ]);

    const receivablesValue = new Prisma.Decimal(receivablesSummary._sum.amount ?? 0).add(
      unbilledPartsSummary._sum.totalPrice ?? 0,
    );
    const stockOutValue = this.stockOutValueService.calculateFromServiceOrders(paidServiceOrders);

    return {
      receivablesValue,
      stockOutValue,
    };
  }

  async update(
    id: string,
    updateFinancialEntryDto: UpdateFinancialEntryDto,
  ): Promise<FinancialEntryResponseDto> {
    await this.syncOverdueStatuses();

    const entry = await this.prisma.financialEntry.findUnique({
      where: { id },
      include: { client: true, serviceOrder: true },
    });

    if (!entry) {
      throw new NotFoundException('Lancamento financeiro nao encontrado');
    }

    if (entry.status === FinancialStatus.PAGO) {
      throw new BadRequestException('Lancamentos financeiros pagos nao podem ser atualizados');
    }

    await this.validateReferences(
      updateFinancialEntryDto.clientId ?? entry.clientId ?? undefined,
      updateFinancialEntryDto.serviceOrderId ?? entry.serviceOrderId ?? undefined,
    );

    const updated = await this.prisma.financialEntry.update({
      where: { id },
      data: {
        type: updateFinancialEntryDto.type,
        description: updateFinancialEntryDto.description,
        category: updateFinancialEntryDto.category,
        amount: updateFinancialEntryDto.amount,
        paymentMethod: updateFinancialEntryDto.paymentMethod,
        clientId: updateFinancialEntryDto.clientId,
        serviceOrderId: updateFinancialEntryDto.serviceOrderId,
        notes: updateFinancialEntryDto.notes,
        dueDate: updateFinancialEntryDto.dueDate
          ? new Date(updateFinancialEntryDto.dueDate)
          : undefined,
        status:
          updateFinancialEntryDto.status ??
          this.resolveOpenStatus(updateFinancialEntryDto.dueDate, entry.dueDate),
      },
      include: { client: true, serviceOrder: true },
    });

    return toFinancialEntryResponseDto(updated);
  }

  async pay(
    id: string,
    payFinancialEntryDto: PayFinancialEntryDto,
  ): Promise<FinancialEntryResponseDto> {
    await this.syncOverdueStatuses();

    const entry = await this.prisma.financialEntry.findUnique({
      where: { id },
      include: { client: true, serviceOrder: true },
    });

    if (!entry) {
      throw new NotFoundException('Lancamento financeiro nao encontrado');
    }

    if (entry.status === FinancialStatus.PAGO) {
      throw new BadRequestException('O lancamento financeiro ja foi pago');
    }

    const paidAt = new Date(payFinancialEntryDto.paidAt);

    const updated = await this.prisma.financialEntry.update({
      where: { id },
      data: {
        status: FinancialStatus.PAGO,
        paymentMethod: payFinancialEntryDto.paymentMethod,
        paidAt,
      },
      include: { client: true, serviceOrder: true },
    });

    return toFinancialEntryResponseDto(updated);
  }

  private async validateReferences(clientId?: string, serviceOrderId?: string) {
    const [client, serviceOrder] = await Promise.all([
      clientId ? this.clientsService.ensureExists(clientId) : Promise.resolve(null),
      serviceOrderId
        ? this.serviceOrdersService.ensureExists(serviceOrderId)
        : Promise.resolve(null),
    ]);

    if (client && serviceOrder && serviceOrder.clientId !== client.id) {
      throw new BadRequestException(
        'O cliente do lancamento financeiro deve ser o mesmo da ordem de servico vinculada',
      );
    }
  }

  private resolveOpenStatus(dueDateValue?: string, fallbackDueDate?: Date) {
    const dueDate = dueDateValue ? new Date(dueDateValue) : fallbackDueDate;

    if (!dueDate) {
      return undefined;
    }

    return dueDate < new Date() ? FinancialStatus.VENCIDO : FinancialStatus.PENDENTE;
  }

  private async syncOverdueStatuses() {
    await this.prisma.financialEntry.updateMany({
      where: {
        status: FinancialStatus.PENDENTE,
        dueDate: { lt: new Date() },
      },
      data: {
        status: FinancialStatus.VENCIDO,
      },
    });
  }
}
