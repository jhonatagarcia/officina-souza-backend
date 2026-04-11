import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ClientDetailResponseDto,
  ClientResponseDto,
  toClientDetailResponseDto,
  toClientResponseDto,
} from 'src/clients/dto/client-response.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { buildPaginationMeta, PaginatedResponse } from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClientDto } from 'src/clients/dto/create-client.dto';
import { UpdateClientDto } from 'src/clients/dto/update-client.dto';

const CLIENT_ORDERABLE_FIELDS = new Set(['name', 'createdAt', 'updatedAt']);

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto): Promise<ClientResponseDto> {
    if (createClientDto.document) {
      const existing = await this.prisma.client.findUnique({
        where: { document: createClientDto.document },
      });

      if (existing) {
        throw new ConflictException('Ja existe um cliente com este CPF/CNPJ');
      }
    }

    const client = await this.prisma.client.create({
      data: createClientDto,
    });

    return toClientResponseDto(client);
  }

  async findAll(pagination: PaginationQueryDto): Promise<PaginatedResponse<ClientResponseDto>> {
    const where: Prisma.ClientWhereInput = {
      isActive: true,
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

    const sortBy = CLIENT_ORDERABLE_FIELDS.has(pagination.sortBy ?? '')
      ? (pagination.sortBy ?? 'createdAt')
      : 'createdAt';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { [sortBy]: pagination.sortOrder },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: data.map(toClientResponseDto),
      meta: buildPaginationMeta(pagination, total),
    };
  }

  async findOne(id: string): Promise<ClientDetailResponseDto> {
    const client = await this.prisma.client.findFirst({
      where: { id, isActive: true },
      include: {
        vehicles: true,
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    return toClientDetailResponseDto(client);
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<ClientResponseDto> {
    await this.ensureExists(id);

    if (updateClientDto.document) {
      const existing = await this.prisma.client.findFirst({
        where: {
          document: updateClientDto.document,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Ja existe um cliente com este CPF/CNPJ');
      }
    }

    const client = await this.prisma.client.update({
      where: { id },
      data: updateClientDto,
    });

    return toClientResponseDto(client);
  }

  async remove(id: string): Promise<ClientResponseDto> {
    await this.ensureExists(id);

    const client = await this.prisma.client.update({
      where: { id },
      data: { isActive: false },
    });

    return toClientResponseDto(client);
  }

  async ensureExists(id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, isActive: true },
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    return client;
  }
}
