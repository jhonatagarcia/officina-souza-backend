import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClientsService } from 'src/clients/clients.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { requireWorkshopId } from 'src/common/tenant/tenant-context';
import type { RequestUser } from 'src/common/types/request-user.type';
import { buildPaginationMeta, PaginatedResponse } from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateVehicleDto } from 'src/vehicles/dto/create-vehicle.dto';
import { UpdateVehicleDto } from 'src/vehicles/dto/update-vehicle.dto';
import {
  VehicleDetailResponseDto,
  VehicleHistoryEntryResponseDto,
  VehicleResponseDto,
  toVehicleDetailResponseDto,
  toVehicleHistoryEntryResponseDto,
  toVehicleResponseDto,
} from 'src/vehicles/dto/vehicle-response.dto';

const VEHICLE_ORDERABLE_FIELDS = new Set(['plate', 'brand', 'model', 'year', 'createdAt']);

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
  ) {}

  async create(user: RequestUser, createVehicleDto: CreateVehicleDto): Promise<VehicleResponseDto> {
    const workshopId = requireWorkshopId(user);
    await this.clientsService.ensureExists(workshopId, createVehicleDto.clientId);
    await this.ensureUniquePlate(workshopId, createVehicleDto.plate);

    const vehicle = await this.prisma.vehicle.create({
      data: {
        workshopId,
        clientId: createVehicleDto.clientId,
        plate: createVehicleDto.plate.toUpperCase(),
        brand: createVehicleDto.brand,
        model: createVehicleDto.model,
        year: createVehicleDto.year,
        color: createVehicleDto.color,
        mileage: createVehicleDto.mileage,
        fuel: createVehicleDto.fuel,
        notes: createVehicleDto.notes,
      },
    });

    return toVehicleResponseDto(vehicle);
  }

  async findAll(
    user: RequestUser,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<VehicleDetailResponseDto>> {
    const workshopId = requireWorkshopId(user);
    const where: Prisma.VehicleWhereInput = {
      workshopId,
      ...(pagination.search
        ? {
            OR: [
              { plate: { contains: pagination.search, mode: 'insensitive' } },
              { brand: { contains: pagination.search, mode: 'insensitive' } },
              { model: { contains: pagination.search, mode: 'insensitive' } },
              { client: { name: { contains: pagination.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const sortBy = VEHICLE_ORDERABLE_FIELDS.has(pagination.sortBy ?? '')
      ? (pagination.sortBy ?? 'createdAt')
      : 'createdAt';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { [sortBy]: pagination.sortOrder },
        include: {
          client: true,
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      data: data.map(toVehicleDetailResponseDto),
      meta: buildPaginationMeta(pagination, total),
    };
  }

  async findOne(user: RequestUser, id: string): Promise<VehicleDetailResponseDto> {
    const workshopId = requireWorkshopId(user);
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id_workshopId: { id, workshopId } },
      include: {
        client: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Veiculo nao encontrado');
    }

    return toVehicleDetailResponseDto(vehicle);
  }

  async update(
    user: RequestUser,
    id: string,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    const workshopId = requireWorkshopId(user);
    await this.ensureExists(workshopId, id);

    if (updateVehicleDto.clientId) {
      await this.clientsService.ensureExists(workshopId, updateVehicleDto.clientId);
    }

    const plate = updateVehicleDto.plate?.toUpperCase();

    if (plate) {
      await this.ensureUniquePlate(workshopId, plate, id);
    }

    const vehicle = await this.prisma.vehicle.update({
      where: { id_workshopId: { id, workshopId } },
      data: {
        clientId: updateVehicleDto.clientId,
        plate,
        brand: updateVehicleDto.brand,
        model: updateVehicleDto.model,
        year: updateVehicleDto.year,
        color: updateVehicleDto.color,
        mileage: updateVehicleDto.mileage,
        fuel: updateVehicleDto.fuel,
        notes: updateVehicleDto.notes,
      },
    });

    return toVehicleResponseDto(vehicle);
  }

  async getHistory(user: RequestUser, id: string): Promise<VehicleHistoryEntryResponseDto[]> {
    const workshopId = requireWorkshopId(user);
    await this.ensureExists(workshopId, id);

    const history = await this.prisma.vehicleHistory.findMany({
      where: { vehicleId: id, workshopId },
      orderBy: { entryDate: 'desc' },
    });

    return history.map(toVehicleHistoryEntryResponseDto);
  }

  async ensureExists(workshopId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id_workshopId: { id, workshopId } },
    });

    if (!vehicle) {
      throw new NotFoundException('Veiculo nao encontrado');
    }

    return vehicle;
  }

  private async ensureUniquePlate(workshopId: string, plate: string, excludeId?: string) {
    const existing = await this.prisma.vehicle.findFirst({
      where: {
        workshopId,
        plate: plate.toUpperCase(),
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });

    if (existing) {
      throw new ConflictException('Ja existe um veiculo com esta placa');
    }
  }
}
