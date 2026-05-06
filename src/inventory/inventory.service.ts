import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@prisma/client';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { buildSafeOrderBy } from 'src/common/utils/order-by.util';
import { buildPaginationMeta, PaginatedResponse } from 'src/common/utils/pagination.util';
import {
  InventoryItemResponseDto,
  toInventoryItemResponseDto,
} from 'src/inventory/dto/inventory-item-response.dto';
import { isLowStock } from 'src/inventory/utils/inventory-stock-status.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInventoryItemDto } from 'src/inventory/dto/create-inventory-item.dto';
import {
  InventoryMovementResponseDto,
  toInventoryMovementResponseDto,
} from 'src/inventory/dto/inventory-movement-response.dto';
import { UpdateInventoryItemDto } from 'src/inventory/dto/update-inventory-item.dto';

const INVENTORY_ORDERABLE_FIELDS = new Set([
  'name',
  'internalCode',
  'quantity',
  'createdAt',
] as const);

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createInventoryItemDto: CreateInventoryItemDto): Promise<InventoryItemResponseDto> {
    const internalCode = createInventoryItemDto.internalCode ?? (await this.generateInternalCode());

    await this.ensureUniqueCode(internalCode);

    const item = await this.prisma.inventoryItem.create({
      data: {
        name: createInventoryItemDto.name,
        internalCode,
        category: createInventoryItemDto.category,
        supplier: createInventoryItemDto.supplier,
        quantity: createInventoryItemDto.quantity,
        minimumQuantity: createInventoryItemDto.minimumQuantity,
        cost: createInventoryItemDto.cost,
        salePrice: createInventoryItemDto.salePrice,
      },
    });

    return toInventoryItemResponseDto(item);
  }

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<InventoryItemResponseDto>> {
    const where: Prisma.InventoryItemWhereInput = pagination.search
      ? {
          OR: [
            { name: { contains: pagination.search, mode: 'insensitive' } },
            { internalCode: { contains: pagination.search, mode: 'insensitive' } },
            { category: { contains: pagination.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: buildSafeOrderBy(
          INVENTORY_ORDERABLE_FIELDS,
          pagination.sortBy,
          'createdAt',
          pagination.sortOrder,
        ),
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return {
      data: data.map(toInventoryItemResponseDto),
      meta: buildPaginationMeta(pagination, total),
    };
  }

  async findOne(id: string): Promise<InventoryItemResponseDto> {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Item de estoque nao encontrado');
    }

    return toInventoryItemResponseDto(item);
  }

  async update(
    id: string,
    updateInventoryItemDto: UpdateInventoryItemDto,
  ): Promise<InventoryItemResponseDto> {
    const currentItem = await this.prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!currentItem) {
      throw new NotFoundException('Item de estoque nao encontrado');
    }

    if (updateInventoryItemDto.internalCode) {
      await this.ensureUniqueCode(updateInventoryItemDto.internalCode, id);
    }

    const item = await this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.inventoryItem.update({
        where: { id },
        data: {
          name: updateInventoryItemDto.name,
          internalCode: updateInventoryItemDto.internalCode,
          category: updateInventoryItemDto.category,
          supplier: updateInventoryItemDto.supplier,
          quantity: updateInventoryItemDto.quantity,
          minimumQuantity: updateInventoryItemDto.minimumQuantity,
          cost: updateInventoryItemDto.cost,
          salePrice: updateInventoryItemDto.salePrice,
        },
      });

      if (
        updateInventoryItemDto.quantity !== undefined &&
        updateInventoryItemDto.quantity !== currentItem.quantity
      ) {
        const quantityChange = updateInventoryItemDto.quantity - currentItem.quantity;

        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: id,
            type: InventoryMovementType.ADJUSTMENT,
            quantityChange,
            quantityBefore: currentItem.quantity,
            quantityAfter: updateInventoryItemDto.quantity,
            unitCost: updatedItem.cost,
            totalCost: new Prisma.Decimal(updatedItem.cost).mul(Math.abs(quantityChange)),
            reason: 'Ajuste manual de estoque',
          },
        });
      }

      return updatedItem;
    });

    return toInventoryItemResponseDto(item);
  }

  async getLowStockAlerts(): Promise<InventoryItemResponseDto[]> {
    const items = await this.prisma.inventoryItem.findMany({
      orderBy: { quantity: 'asc' },
    });

    return items
      .filter((item) => isLowStock(item.quantity, item.minimumQuantity))
      .map(toInventoryItemResponseDto);
  }

  async getMovements(inventoryItemId: string): Promise<InventoryMovementResponseDto[]> {
    await this.findOne(inventoryItemId);

    const movements = await this.prisma.inventoryMovement.findMany({
      where: { inventoryItemId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        serviceOrder: {
          include: {
            client: true,
          },
        },
      },
    });

    return movements.map(toInventoryMovementResponseDto);
  }

  async reserveOrConsumePart(
    inventoryItemId: string,
    quantity: number,
    tx: Prisma.TransactionClient,
    context?: {
      serviceOrderId?: string;
      serviceOrderPartId?: string;
      reason?: string;
    },
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('A quantidade deve ser maior que zero');
    }

    const result = await tx.inventoryItem.updateMany({
      where: {
        id: inventoryItemId,
        quantity: {
          gte: quantity,
        },
      },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    });

    if (result.count > 0) {
      const updatedItem = await tx.inventoryItem.findUniqueOrThrow({
        where: { id: inventoryItemId },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId,
          serviceOrderId: context?.serviceOrderId,
          serviceOrderPartId: context?.serviceOrderPartId,
          type: InventoryMovementType.OUT,
          quantityChange: -quantity,
          quantityBefore: updatedItem.quantity + quantity,
          quantityAfter: updatedItem.quantity,
          unitCost: updatedItem.cost,
          totalCost: new Prisma.Decimal(updatedItem.cost).mul(quantity),
          reason: context?.reason ?? 'Saida de estoque por ordem de servico',
        },
      });

      return updatedItem;
    }

    const item = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });

    if (!item) {
      throw new NotFoundException('Item de estoque nao encontrado');
    }

    throw new BadRequestException('Quantidade insuficiente em estoque');
  }

  private async ensureUniqueCode(code: string, excludeId?: string) {
    const existing = await this.prisma.inventoryItem.findFirst({
      where: {
        internalCode: code,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });

    if (existing) {
      throw new ConflictException('Ja existe um item de estoque com este codigo interno');
    }
  }

  private async generateInternalCode() {
    const lastGeneratedItem = await this.prisma.inventoryItem.findFirst({
      where: {
        internalCode: {
          startsWith: 'P-',
        },
      },
      orderBy: {
        internalCode: 'desc',
      },
    });

    const lastSequence = lastGeneratedItem
      ? Number(lastGeneratedItem.internalCode.replace(/^P-/, ''))
      : 0;
    const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

    return `P-${nextSequence.toString().padStart(6, '0')}`;
  }
}
