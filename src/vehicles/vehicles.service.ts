import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClientsService } from 'src/clients/clients.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
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

  async create(createVehicleDto: CreateVehicleDto): Promise<VehicleResponseDto> {
    await this.clientsService.ensureExists(createVehicleDto.clientId);
    await this.ensureUniquePlate(createVehicleDto.plate);

    const vehicle = await this.prisma.vehicle.create({
      data: {
        ...createVehicleDto,
        plate: createVehicleDto.plate.toUpperCase(),
      },
    });

    return toVehicleResponseDto(vehicle);
  }

  async findAll(pagination: PaginationQueryDto): Promise<PaginatedResponse<VehicleDetailResponseDto>> {
    const where: Prisma.VehicleWhereInput = pagination.search
      ? {
          OR: [
            { plate: { contains: pagination.search, mode: 'insensitive' } },
            { brand: { contains: pagination.search, mode: 'insensitive' } },
            { model: { contains: pagination.search, mode: 'insensitive' } },
            { client: { name: { contains: pagination.search, mode: 'insensitive' } } },
          ],
        }
      : {};

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

  async findOne(id: string): Promise<VehicleDetailResponseDto> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        client: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return toVehicleDetailResponseDto(vehicle);
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto): Promise<VehicleResponseDto> {
    await this.ensureExists(id);

    if (updateVehicleDto.clientId) {
      await this.clientsService.ensureExists(updateVehicleDto.clientId);
    }

    if (updateVehicleDto.plate) {
      await this.ensureUniquePlate(updateVehicleDto.plate, id);
      updateVehicleDto.plate = updateVehicleDto.plate.toUpperCase();
    }

    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data: updateVehicleDto,
    });

    return toVehicleResponseDto(vehicle);
  }

  async getHistory(id: string): Promise<VehicleHistoryEntryResponseDto[]> {
    await this.ensureExists(id);

    const history = await this.prisma.vehicleHistory.findMany({
      where: { vehicleId: id },
      orderBy: { entryDate: 'desc' },
    });

    return history.map(toVehicleHistoryEntryResponseDto);
  }

  async ensureExists(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  private async ensureUniquePlate(plate: string, excludeId?: string) {
    const existing = await this.prisma.vehicle.findFirst({
      where: {
        plate: plate.toUpperCase(),
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });

    if (existing) {
      throw new ConflictException('Vehicle plate already exists');
    }
  }
}
