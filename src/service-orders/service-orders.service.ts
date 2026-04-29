import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceOrderStatus } from '@prisma/client';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { buildPaginationMeta, PaginatedResponse } from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddServiceOrderPartDto } from 'src/service-orders/dto/add-service-order-part.dto';
import { CreateServiceOrderDto } from 'src/service-orders/dto/create-service-order.dto';
import { UpdateServiceOrderStatusDto } from 'src/service-orders/dto/update-service-order-status.dto';
import { UpdateServiceOrderDto } from 'src/service-orders/dto/update-service-order.dto';
import {
  ServiceOrderDetailResponseDto,
  ServiceOrderListResponseDto,
  ServiceOrderPartResponseDto,
  ServiceOrderResponseDto,
  toServiceOrderDetailResponseDto,
  toServiceOrderListResponseDto,
  toServiceOrderPartResponseDto,
  toServiceOrderResponseDto,
} from 'src/service-orders/dto/service-order-response.dto';
import { ServiceOrderReferenceValidatorService } from 'src/service-orders/services/service-order-reference-validator.service';
import { AddServiceOrderPartUseCase } from 'src/service-orders/use-cases/add-service-order-part.use-case';
import { CreateServiceOrderUseCase } from 'src/service-orders/use-cases/create-service-order.use-case';
import { UpdateServiceOrderStatusUseCase } from 'src/service-orders/use-cases/update-service-order-status.use-case';

const SERVICE_ORDER_ORDERABLE_FIELDS = new Set([
  'orderNumber',
  'createdAt',
  'updatedAt',
  'status',
  'openedAt',
]);

@Injectable()
export class ServiceOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referenceValidator: ServiceOrderReferenceValidatorService,
    private readonly createServiceOrderUseCase: CreateServiceOrderUseCase,
    private readonly addServiceOrderPartUseCase: AddServiceOrderPartUseCase,
    private readonly updateServiceOrderStatusUseCase: UpdateServiceOrderStatusUseCase,
  ) {}

  async create(createServiceOrderDto: CreateServiceOrderDto): Promise<ServiceOrderResponseDto> {
    const serviceOrder = await this.createServiceOrderUseCase.execute(createServiceOrderDto);

    return toServiceOrderResponseDto(serviceOrder);
  }

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<ServiceOrderListResponseDto>> {
    const where: Prisma.ServiceOrderWhereInput = {
      ...(pagination.search
        ? {
            OR: [
              { orderNumber: { contains: pagination.search, mode: 'insensitive' } },
              { problemDescription: { contains: pagination.search, mode: 'insensitive' } },
              { client: { name: { contains: pagination.search, mode: 'insensitive' } } },
              { vehicle: { plate: { contains: pagination.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(pagination.status
        ? { status: pagination.status as ServiceOrderStatus }
        : {}),
    };

    const sortBy = SERVICE_ORDER_ORDERABLE_FIELDS.has(pagination.sortBy ?? '')
      ? (pagination.sortBy ?? 'createdAt')
      : 'createdAt';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.serviceOrder.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { [sortBy]: pagination.sortOrder },
        include: {
          client: true,
          vehicle: true,
          mechanic: true,
        },
      }),
      this.prisma.serviceOrder.count({ where }),
    ]);

    return {
      data: data.map(toServiceOrderListResponseDto),
      meta: buildPaginationMeta(pagination, total),
    };
  }

  async findOne(id: string): Promise<ServiceOrderDetailResponseDto> {
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        budget: {
          include: {
            items: {
              include: {
                inventoryItem: true,
                serviceCatalogItem: true,
              },
            },
          },
        },
        client: true,
        vehicle: true,
        mechanic: true,
        parts: {
          include: { inventoryItem: true },
        },
      },
    });

    if (!serviceOrder) {
      throw new NotFoundException('Ordem de servico nao encontrada');
    }

    return toServiceOrderDetailResponseDto(serviceOrder);
  }

  async update(
    id: string,
    updateServiceOrderDto: UpdateServiceOrderDto,
  ): Promise<ServiceOrderResponseDto> {
    const currentServiceOrder = await this.ensureExists(id);
    const updateData: Prisma.ServiceOrderUncheckedUpdateInput = {
      clientId: updateServiceOrderDto.clientId,
      vehicleId: updateServiceOrderDto.vehicleId,
      mechanicId: updateServiceOrderDto.mechanicId,
      problemDescription: updateServiceOrderDto.problemDescription,
      diagnosis: updateServiceOrderDto.diagnosis,
      servicesPerformed: updateServiceOrderDto.servicesPerformed,
      vehicleChecklist: updateServiceOrderDto.vehicleChecklist,
      notes: updateServiceOrderDto.notes,
    };

    if (
      updateServiceOrderDto.clientId ||
      updateServiceOrderDto.vehicleId ||
      updateServiceOrderDto.mechanicId
    ) {
      await this.referenceValidator.validate(
        updateServiceOrderDto.clientId ?? currentServiceOrder.clientId,
        updateServiceOrderDto.vehicleId ?? currentServiceOrder.vehicleId,
        updateServiceOrderDto.mechanicId ?? currentServiceOrder.mechanicId ?? undefined,
      );
    }

    if ('expectedDeliveryAt' in updateServiceOrderDto) {
      updateData.expectedDeliveryAt = this.parseExpectedDeliveryAt(
        updateServiceOrderDto.expectedDeliveryAt,
      );
    }

    const updatedServiceOrder = await this.prisma.serviceOrder.update({
      where: { id },
      data: updateData,
    });

    return toServiceOrderResponseDto(updatedServiceOrder);
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateServiceOrderStatusDto,
  ): Promise<ServiceOrderResponseDto> {
    const serviceOrder = await this.updateServiceOrderStatusUseCase.execute(id, updateStatusDto);

    return toServiceOrderResponseDto(serviceOrder);
  }

  async addPart(
    serviceOrderId: string,
    addPartDto: AddServiceOrderPartDto,
  ): Promise<ServiceOrderPartResponseDto> {
    const part = await this.addServiceOrderPartUseCase.execute(serviceOrderId, addPartDto);

    return toServiceOrderPartResponseDto(part);
  }

  async listParts(serviceOrderId: string): Promise<ServiceOrderPartResponseDto[]> {
    await this.ensureExists(serviceOrderId);

    const parts = await this.prisma.serviceOrderPart.findMany({
      where: { serviceOrderId },
      include: { inventoryItem: true },
      orderBy: { createdAt: 'asc' },
    });

    return parts.map(toServiceOrderPartResponseDto);
  }

  async ensureExists(id: string) {
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id },
    });

    if (!serviceOrder) {
      throw new NotFoundException('Ordem de servico nao encontrada');
    }

    return serviceOrder;
  }

  private parseExpectedDeliveryAt(value: string | null | undefined): Date | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (!/^\d{4}-/.test(value)) {
      throw new BadRequestException('A previsao de entrega deve informar um ano com 4 digitos');
    }

    const expectedDeliveryAt = new Date(value);

    if (Number.isNaN(expectedDeliveryAt.getTime())) {
      throw new BadRequestException('A previsao de entrega deve ser uma data valida');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expectedDeliveryAt < today) {
      throw new BadRequestException('A previsao de entrega nao pode ser anterior ao dia atual');
    }

    return expectedDeliveryAt;
  }
}
