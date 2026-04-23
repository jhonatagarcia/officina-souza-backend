import { Prisma } from '@prisma/client';

export interface BudgetItemResponseDto {
  id: string;
  budgetId: string;
  type: string;
  serviceCatalogItemId: string | null;
  serviceCode: string | null;
  description: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetClientSummaryDto {
  id: string;
  name: string;
  document: string | null;
}

export interface BudgetVehicleSummaryDto {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
}

export interface BudgetServiceOrderSummaryDto {
  id: string;
  orderNumber: string;
  status: string;
  openedAt: Date;
}

export interface BudgetResponseDto {
  id: string;
  code: string;
  clientId: string;
  vehicleId: string;
  status: string;
  problemDescription: string;
  notes: string | null;
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  total: Prisma.Decimal;
  convertedToServiceOrder: boolean;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: BudgetItemResponseDto[];
}

export interface BudgetDetailResponseDto extends BudgetResponseDto {
  client: BudgetClientSummaryDto;
  vehicle: BudgetVehicleSummaryDto;
  serviceOrder: BudgetServiceOrderSummaryDto | null;
}

type BudgetItemModel = Prisma.BudgetItemGetPayload<Record<string, never>>;
type BudgetWithItemsModel = Prisma.BudgetGetPayload<{
  include: { items: true };
}> | (Prisma.BudgetGetPayload<Record<string, never>> & { items?: BudgetItemModel[] });
type BudgetWithRelationsModel = Prisma.BudgetGetPayload<{
  include: { client: true; vehicle: true; items: true; serviceOrder: true };
}>;

export function toBudgetItemResponseDto(item: BudgetItemModel): BudgetItemResponseDto {
  return {
    id: item.id,
    budgetId: item.budgetId,
    type: item.type,
    serviceCatalogItemId: item.serviceCatalogItemId,
    serviceCode: item.serviceCode,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function toBudgetResponseDto(budget: BudgetWithItemsModel): BudgetResponseDto {
  return {
    id: budget.id,
    code: budget.code,
    clientId: budget.clientId,
    vehicleId: budget.vehicleId,
    status: budget.status,
    problemDescription: budget.problemDescription,
    notes: budget.notes,
    subtotal: budget.subtotal,
    discount: budget.discount,
    total: budget.total,
    convertedToServiceOrder: budget.convertedToServiceOrder,
    approvedAt: budget.approvedAt,
    rejectedAt: budget.rejectedAt,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
    items: (budget.items ?? []).map(toBudgetItemResponseDto),
  };
}

export function toBudgetDetailResponseDto(budget: BudgetWithRelationsModel): BudgetDetailResponseDto {
  return {
    ...toBudgetResponseDto(budget),
    client: {
      id: budget.client.id,
      name: budget.client.name,
      document: budget.client.document,
    },
    vehicle: {
      id: budget.vehicle.id,
      plate: budget.vehicle.plate,
      brand: budget.vehicle.brand,
      model: budget.vehicle.model,
      year: budget.vehicle.year,
    },
    serviceOrder: budget.serviceOrder
      ? {
          id: budget.serviceOrder.id,
          orderNumber: budget.serviceOrder.orderNumber,
          status: budget.serviceOrder.status,
          openedAt: budget.serviceOrder.openedAt,
        }
      : null,
  };
}
