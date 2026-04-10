import { Prisma } from '@prisma/client';

export interface ServiceOrderClientSummaryDto {
  id: string;
  name: string;
  document: string | null;
}

export interface ServiceOrderVehicleSummaryDto {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
}

export interface ServiceOrderMechanicSummaryDto {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ServiceOrderPartInventorySummaryDto {
  id: string;
  name: string;
  internalCode: string;
}

export interface ServiceOrderPartResponseDto {
  id: string;
  serviceOrderId: string;
  inventoryItemId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
  inventoryItem: ServiceOrderPartInventorySummaryDto;
}

export interface ServiceOrderResponseDto {
  id: string;
  orderNumber: string;
  budgetId: string | null;
  clientId: string;
  vehicleId: string;
  mechanicId: string | null;
  problemDescription: string;
  diagnosis: string | null;
  servicesPerformed: string | null;
  vehicleChecklist: string | null;
  openedAt: Date;
  expectedDeliveryAt: Date | null;
  finishedAt: Date | null;
  deliveredAt: Date | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceOrderDetailResponseDto extends ServiceOrderResponseDto {
  client: ServiceOrderClientSummaryDto;
  vehicle: ServiceOrderVehicleSummaryDto;
  mechanic: ServiceOrderMechanicSummaryDto | null;
  parts: ServiceOrderPartResponseDto[];
}

export interface ServiceOrderListResponseDto extends ServiceOrderResponseDto {
  client: ServiceOrderClientSummaryDto;
  vehicle: ServiceOrderVehicleSummaryDto;
  mechanic: ServiceOrderMechanicSummaryDto | null;
}

type ServiceOrderModel = Prisma.ServiceOrderGetPayload<Record<string, never>>;
type ServiceOrderListModel = Prisma.ServiceOrderGetPayload<{
  include: {
    client: true;
    vehicle: true;
    mechanic: true;
  };
}>;
type ServiceOrderWithRelationsModel = Prisma.ServiceOrderGetPayload<{
  include: {
    client: true;
    vehicle: true;
    mechanic: true;
    parts: { include: { inventoryItem: true } };
  };
}>;
type ServiceOrderPartWithInventoryModel = Prisma.ServiceOrderPartGetPayload<{
  include: { inventoryItem: true };
}>;

export function toServiceOrderResponseDto(serviceOrder: ServiceOrderModel): ServiceOrderResponseDto {
  return {
    id: serviceOrder.id,
    orderNumber: serviceOrder.orderNumber,
    budgetId: serviceOrder.budgetId,
    clientId: serviceOrder.clientId,
    vehicleId: serviceOrder.vehicleId,
    mechanicId: serviceOrder.mechanicId,
    problemDescription: serviceOrder.problemDescription,
    diagnosis: serviceOrder.diagnosis,
    servicesPerformed: serviceOrder.servicesPerformed,
    vehicleChecklist: serviceOrder.vehicleChecklist,
    openedAt: serviceOrder.openedAt,
    expectedDeliveryAt: serviceOrder.expectedDeliveryAt,
    finishedAt: serviceOrder.finishedAt,
    deliveredAt: serviceOrder.deliveredAt,
    status: serviceOrder.status,
    notes: serviceOrder.notes,
    createdAt: serviceOrder.createdAt,
    updatedAt: serviceOrder.updatedAt,
  };
}

export function toServiceOrderPartResponseDto(
  part: ServiceOrderPartWithInventoryModel,
): ServiceOrderPartResponseDto {
  return {
    id: part.id,
    serviceOrderId: part.serviceOrderId,
    inventoryItemId: part.inventoryItemId,
    quantity: part.quantity,
    unitPrice: part.unitPrice,
    totalPrice: part.totalPrice,
    createdAt: part.createdAt,
    updatedAt: part.updatedAt,
    inventoryItem: {
      id: part.inventoryItem.id,
      name: part.inventoryItem.name,
      internalCode: part.inventoryItem.internalCode,
    },
  };
}

export function toServiceOrderDetailResponseDto(
  serviceOrder: ServiceOrderWithRelationsModel,
): ServiceOrderDetailResponseDto {
  return {
    ...toServiceOrderResponseDto(serviceOrder),
    client: {
      id: serviceOrder.client.id,
      name: serviceOrder.client.name,
      document: serviceOrder.client.document,
    },
    vehicle: {
      id: serviceOrder.vehicle.id,
      plate: serviceOrder.vehicle.plate,
      brand: serviceOrder.vehicle.brand,
      model: serviceOrder.vehicle.model,
      year: serviceOrder.vehicle.year,
    },
    mechanic: serviceOrder.mechanic
      ? {
          id: serviceOrder.mechanic.id,
          name: serviceOrder.mechanic.name,
          email: serviceOrder.mechanic.email,
          role: serviceOrder.mechanic.role,
        }
      : null,
    parts: serviceOrder.parts.map(toServiceOrderPartResponseDto),
  };
}

export function toServiceOrderListResponseDto(
  serviceOrder: ServiceOrderListModel,
): ServiceOrderListResponseDto {
  return {
    ...toServiceOrderResponseDto(serviceOrder),
    client: {
      id: serviceOrder.client.id,
      name: serviceOrder.client.name,
      document: serviceOrder.client.document,
    },
    vehicle: {
      id: serviceOrder.vehicle.id,
      plate: serviceOrder.vehicle.plate,
      brand: serviceOrder.vehicle.brand,
      model: serviceOrder.vehicle.model,
      year: serviceOrder.vehicle.year,
    },
    mechanic: serviceOrder.mechanic
      ? {
          id: serviceOrder.mechanic.id,
          name: serviceOrder.mechanic.name,
          email: serviceOrder.mechanic.email,
          role: serviceOrder.mechanic.role,
        }
      : null,
  };
}
