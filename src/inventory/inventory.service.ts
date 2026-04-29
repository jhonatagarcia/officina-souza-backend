import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FinancialEntryType, FinancialStatus, Prisma } from '@prisma/client';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { buildPaginationMeta, PaginatedResponse } from 'src/common/utils/pagination.util';
import {
  InventoryItemResponseDto,
  toInventoryItemResponseDto,
} from 'src/inventory/dto/inventory-item-response.dto';
import { isLowStock } from 'src/inventory/utils/inventory-stock-status.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInventoryItemDto } from 'src/inventory/dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from 'src/inventory/dto/update-inventory-item.dto';

const INVENTORY_ORDERABLE_FIELDS = new Set(['name', 'internalCode', 'quantity', 'createdAt']);

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createInventoryItemDto: CreateInventoryItemDto): Promise<InventoryItemResponseDto> {
    const internalCode =
      createInventoryItemDto.internalCode ?? (await this.generateInternalCode());

    await this.ensureUniqueCode(internalCode);

    const item = await this.prisma.inventoryItem.create({
      data: {
        ...createInventoryItemDto,
        internalCode,
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

    const sortBy = INVENTORY_ORDERABLE_FIELDS.has(pagination.sortBy ?? '')
      ? (pagination.sortBy ?? 'createdAt')
      : 'createdAt';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { [sortBy]: pagination.sortOrder },
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
    await this.findOne(id);

    if (updateInventoryItemDto.internalCode) {
      await this.ensureUniqueCode(updateInventoryItemDto.internalCode, id);
    }

    const item = await this.prisma.inventoryItem.update({
      where: { id },
      data: updateInventoryItemDto,
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

  async reserveOrConsumePart(
    inventoryItemId: string,
    quantity: number,
    tx: Prisma.TransactionClient,
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
      return tx.inventoryItem.findUniqueOrThrow({
        where: { id: inventoryItemId },
      });
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
