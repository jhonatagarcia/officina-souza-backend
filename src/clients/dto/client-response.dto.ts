import { Prisma } from '@prisma/client';

export interface ClientResponseDto {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ClientVehicleSummaryDto {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string | null;
  mileage: number | null;
}

export interface ClientDetailResponseDto extends ClientResponseDto {
  vehicles: ClientVehicleSummaryDto[];
}

type ClientModel = Prisma.ClientGetPayload<Record<string, never>>;
type ClientWithVehiclesModel = Prisma.ClientGetPayload<{
  include: { vehicles: true };
}>;

export function toClientResponseDto(client: ClientModel): ClientResponseDto {
  return {
    id: client.id,
    name: client.name,
    document: client.document,
    phone: client.phone,
    email: client.email,
    notes: client.notes,
    isActive: client.isActive,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

export function toClientDetailResponseDto(
  client: ClientWithVehiclesModel,
): ClientDetailResponseDto {
  return {
    ...toClientResponseDto(client),
    vehicles: client.vehicles.map((vehicle) => ({
      id: vehicle.id,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      mileage: vehicle.mileage,
    })),
  };
}
