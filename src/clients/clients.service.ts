import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ClientDetailResponseDto,
  ClientResponseDto,
  toClientDetailResponseDto,
  toClientResponseDto,
} from 'src/clients/dto/client-response.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { buildSafeOrderBy } from 'src/common/utils/order-by.util';
import { buildPaginationMeta, PaginatedResponse } from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClientDto } from 'src/clients/dto/create-client.dto';
import { UpdateClientDto } from 'src/clients/dto/update-client.dto';
import { requireWorkshopId } from 'src/common/tenant/tenant-context';
import type { RequestUser } from 'src/common/types/request-user.type';

const CLIENT_ORDERABLE_FIELDS = new Set(['name', 'createdAt', 'updatedAt'] as const);

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: RequestUser, createClientDto: CreateClientDto): Promise<ClientResponseDto> {
    const workshopId = requireWorkshopId(user);

    if (createClientDto.document) {
      const existing = await this.prisma.client.findFirst({
        where: { workshopId, document: createClientDto.document },
      });

      if (existing) {
        throw new ConflictException('Ja existe um cliente com este CPF/CNPJ');
      }
    }

    const client = await this.prisma.client.create({
      data: { ...createClientDto, workshopId },
    });

    return toClientResponseDto(client);
  }

  async findAll(
    user: RequestUser,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<ClientResponseDto>> {
    const workshopId = requireWorkshopId(user);
    const where: Prisma.ClientWhereInput = {
      workshopId,
      ...(pagination.search
        ? {
            OR: [
              { name: { contains: pagination.search, mode: 'insensitive' } },
              { document: { contains: pagination.search, mode: 'insensitive' } },
              { phone: { contains: pagination.search, mode: 'insensitive' } },
              { email: { contains: pagination.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: buildSafeOrderBy(
          CLIENT_ORDERABLE_FIELDS,
          pagination.sortBy,
          'createdAt',
          pagination.sortOrder,
        ),
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: data.map(toClientResponseDto),
      meta: buildPaginationMeta(pagination, total),
    };
  }

  async findOne(user: RequestUser, id: string): Promise<ClientDetailResponseDto> {
    const workshopId = requireWorkshopId(user);
    const client = await this.prisma.client.findUnique({
      where: { id_workshopId: { id, workshopId } },
      include: {
        vehicles: true,
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    return toClientDetailResponseDto(client);
  }

  async update(
    user: RequestUser,
    id: string,
    updateClientDto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    const workshopId = requireWorkshopId(user);
    await this.ensureExists(workshopId, id);

    if (updateClientDto.document) {
      const existing = await this.prisma.client.findFirst({
        where: {
          document: updateClientDto.document,
          workshopId,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Ja existe um cliente com este CPF/CNPJ');
      }
    }

    const client = await this.prisma.client.update({
      where: { id_workshopId: { id, workshopId } },
      data: updateClientDto,
    });

    return toClientResponseDto(client);
  }

  async remove(user: RequestUser, id: string): Promise<ClientResponseDto> {
    const workshopId = requireWorkshopId(user);
    await this.ensureExists(workshopId, id);

    const client = await this.prisma.client.update({
      where: { id_workshopId: { id, workshopId } },
      data: { isActive: false },
    });

    return toClientResponseDto(client);
  }

  async ensureExists(workshopId: string, id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id_workshopId: { id, workshopId }, isActive: true },
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    return client;
  }
}
