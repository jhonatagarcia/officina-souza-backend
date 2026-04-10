import { Prisma } from '@prisma/client';

export interface VehicleClientSummaryDto {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
}

export interface VehicleResponseDto {
  id: string;
  clientId: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string | null;
  mileage: number | null;
  fuel: string | null;
  chassis: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleDetailResponseDto extends VehicleResponseDto {
  client: VehicleClientSummaryDto;
}

export interface VehicleHistoryEntryResponseDto {
  id: string;
  vehicleId: string;
  serviceOrderId: string | null;
  entryDate: Date;
  mileage: number | null;
  servicesSummary: string;
  partsSummary: string | null;
  totalAmount: Prisma.Decimal | null;
  createdAt: Date;
  updatedAt: Date;
}

type VehicleModel = Prisma.VehicleGetPayload<Record<string, never>>;
type VehicleWithClientModel = Prisma.VehicleGetPayload<{
  include: { client: true };
}>;
type VehicleHistoryModel = Prisma.VehicleHistoryGetPayload<Record<string, never>>;

export function toVehicleResponseDto(vehicle: VehicleModel): VehicleResponseDto {
  return {
    id: vehicle.id,
    clientId: vehicle.clientId,
    plate: vehicle.plate,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
    mileage: vehicle.mileage,
    fuel: vehicle.fuel,
    chassis: vehicle.chassis,
    notes: vehicle.notes,
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt,
  };
}

export function toVehicleDetailResponseDto(vehicle: VehicleWithClientModel): VehicleDetailResponseDto {
  return {
    ...toVehicleResponseDto(vehicle),
    client: {
      id: vehicle.client.id,
      name: vehicle.client.name,
      document: vehicle.client.document,
      phone: vehicle.client.phone,
      email: vehicle.client.email,
    },
  };
}

export function toVehicleHistoryEntryResponseDto(
  entry: VehicleHistoryModel,
): VehicleHistoryEntryResponseDto {
  return {
    id: entry.id,
    vehicleId: entry.vehicleId,
    serviceOrderId: entry.serviceOrderId,
    entryDate: entry.entryDate,
    mileage: entry.mileage,
    servicesSummary: entry.servicesSummary,
    partsSummary: entry.partsSummary,
    totalAmount: entry.totalAmount,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}
