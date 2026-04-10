import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialStatus, Prisma } from '@prisma/client';
import { ClientsService } from 'src/clients/clients.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { buildPaginationMeta, PaginatedResponse } from 'src/common/utils/pagination.util';
import {
  FinancialEntryResponseDto,
  toFinancialEntryResponseDto,
} from 'src/financial/dto/financial-entry-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ServiceOrdersService } from 'src/service-orders/service-orders.service';
import { CreateFinancialEntryDto } from 'src/financial/dto/create-financial-entry.dto';
import { PayFinancialEntryDto } from 'src/financial/dto/pay-financial-entry.dto';
import { UpdateFinancialEntryDto } from 'src/financial/dto/update-financial-entry.dto';

const FINANCIAL_ORDERABLE_FIELDS = new Set(['dueDate', 'createdAt', 'amount', 'status']);

@Injectable()
export class FinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
    private readonly serviceOrdersService: ServiceOrdersService,
  ) {}

  async create(createFinancialEntryDto: CreateFinancialEntryDto): Promise<FinancialEntryResponseDto> {
    await this.validateReferences(
      createFinancialEntryDto.clientId,
      createFinancialEntryDto.serviceOrderId,
    );

    const dueDate = new Date(createFinancialEntryDto.dueDate);
    const status =
      createFinancialEntryDto.status ??
      (dueDate < new Date() ? FinancialStatus.VENCIDO : FinancialStatus.PENDENTE);

    const entry = await this.prisma.financialEntry.create({
      data: {
        ...createFinancialEntryDto,
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
    const where: Prisma.FinancialEntryWhereInput = pagination.search
      ? {
          OR: [
            { description: { contains: pagination.search, mode: 'insensitive' } },
            { category: { contains: pagination.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const sortBy = FINANCIAL_ORDERABLE_FIELDS.has(pagination.sortBy ?? '')
      ? (pagination.sortBy ?? 'createdAt')
      : 'createdAt';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.financialEntry.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { [sortBy]: pagination.sortOrder },
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
    const entry = await this.prisma.financialEntry.findUnique({
      where: { id },
      include: { client: true, serviceOrder: true },
    });

    if (!entry) {
      throw new NotFoundException('Financial entry not found');
    }

    return toFinancialEntryResponseDto(entry);
  }

  async update(
    id: string,
    updateFinancialEntryDto: UpdateFinancialEntryDto,
  ): Promise<FinancialEntryResponseDto> {
    const entry = await this.prisma.financialEntry.findUnique({
      where: { id },
      include: { client: true, serviceOrder: true },
    });

    if (!entry) {
      throw new NotFoundException('Financial entry not found');
    }

    if (entry.status === FinancialStatus.PAGO) {
      throw new BadRequestException('Paid financial entries cannot be updated');
    }

    await this.validateReferences(
      updateFinancialEntryDto.clientId ?? entry.clientId ?? undefined,
      updateFinancialEntryDto.serviceOrderId ?? entry.serviceOrderId ?? undefined,
    );

    const updated = await this.prisma.financialEntry.update({
      where: { id },
      data: {
        ...updateFinancialEntryDto,
        dueDate: updateFinancialEntryDto.dueDate
          ? new Date(updateFinancialEntryDto.dueDate)
          : undefined,
      },
      include: { client: true, serviceOrder: true },
    });

    return toFinancialEntryResponseDto(updated);
  }

  async pay(id: string, payFinancialEntryDto: PayFinancialEntryDto): Promise<FinancialEntryResponseDto> {
    const entry = await this.prisma.financialEntry.findUnique({
      where: { id },
      include: { client: true, serviceOrder: true },
    });

    if (!entry) {
      throw new NotFoundException('Financial entry not found');
    }

    if (entry.status === FinancialStatus.PAGO) {
      throw new BadRequestException('Financial entry is already paid');
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
        'Financial entry client must match the linked service order client',
      );
    }
  }
}
