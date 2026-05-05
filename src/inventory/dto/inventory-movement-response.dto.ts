import { InventoryMovementType, Prisma } from '@prisma/client';

export interface InventoryMovementResponseDto {
  id: string;
  inventoryItemId: string;
  serviceOrderId: string | null;
  serviceOrderPartId: string | null;
  type: InventoryMovementType;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost: Prisma.Decimal | null;
  totalCost: Prisma.Decimal | null;
  reason: string | null;
  createdAt: Date;
  serviceOrder: {
    id: string;
    orderNumber: string;
    status: string;
    client: {
      id: string;
      name: string;
    };
  } | null;
}

type InventoryMovementModel = Prisma.InventoryMovementGetPayload<{
  include: {
    serviceOrder: {
      include: {
        client: true;
      };
    };
  };
}>;

export function toInventoryMovementResponseDto(
  movement: InventoryMovementModel,
): InventoryMovementResponseDto {
  return {
    id: movement.id,
    inventoryItemId: movement.inventoryItemId,
    serviceOrderId: movement.serviceOrderId,
    serviceOrderPartId: movement.serviceOrderPartId,
    type: movement.type,
    quantityChange: movement.quantityChange,
    quantityBefore: movement.quantityBefore,
    quantityAfter: movement.quantityAfter,
    unitCost: movement.unitCost,
    totalCost: movement.totalCost,
    reason: movement.reason,
    createdAt: movement.createdAt,
    serviceOrder: movement.serviceOrder
      ? {
          id: movement.serviceOrder.id,
          orderNumber: movement.serviceOrder.orderNumber,
          status: movement.serviceOrder.status,
          client: {
            id: movement.serviceOrder.client.id,
            name: movement.serviceOrder.client.name,
          },
        }
      : null,
  };
}
