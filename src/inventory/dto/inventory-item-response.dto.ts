import { Prisma } from '@prisma/client';

export interface InventoryItemResponseDto {
  id: string;
  name: string;
  internalCode: string;
  category: string | null;
  supplier: string | null;
  quantity: number;
  minimumQuantity: number;
  cost: Prisma.Decimal;
  salePrice: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
}

type InventoryItemModel = Prisma.InventoryItemGetPayload<Record<string, never>>;

export function toInventoryItemResponseDto(item: InventoryItemModel): InventoryItemResponseDto {
  return {
    id: item.id,
    name: item.name,
    internalCode: item.internalCode,
    category: item.category,
    supplier: item.supplier,
    quantity: item.quantity,
    minimumQuantity: item.minimumQuantity,
    cost: item.cost,
    salePrice: item.salePrice,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
