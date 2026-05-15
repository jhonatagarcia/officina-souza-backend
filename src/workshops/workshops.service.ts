import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateWorkshopDto, UpsertWorkshopDto } from 'src/workshops/dto/upsert-workshop.dto';
import { WorkshopResponseDto } from 'src/workshops/dto/workshop-response.dto';
import { normalizeCnpj } from 'src/workshops/utils/cnpj.util';
import { toWorkshopResponseDto } from 'src/workshops/workshop.mapper';

interface WorkshopPersistenceData {
  tradeName: string;
  cnpj: string | null;
  isActive?: boolean;
}

@Injectable()
export class WorkshopsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(workshopId?: string | null): Promise<WorkshopResponseDto> {
    const workshop = await this.findWorkshop(workshopId);

    if (!workshop) {
      throw new NotFoundException('Oficina nao cadastrada');
    }

    return toWorkshopResponseDto(workshop);
  }

  async upsertProfile(
    dto: UpsertWorkshopDto,
    workshopId?: string | null,
  ): Promise<WorkshopResponseDto> {
    const existing = workshopId
      ? await this.prisma.workshop.findUnique({ where: { id: workshopId } })
      : await this.prisma.workshop.findFirst({
          orderBy: { createdAt: 'asc' },
        });
    const data = this.buildPersistenceData(dto);

    try {
      const workshop = existing
        ? await this.prisma.workshop.update({
            where: { id: existing.id },
            data,
          })
        : await this.prisma.workshop.create({
            data: {
              tradeName: data.tradeName,
              cnpj: data.cnpj,
              isActive: data.isActive ?? true,
            },
          });

      return toWorkshopResponseDto(workshop);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('CNPJ ja cadastrado');
      }

      throw error;
    }
  }

  async updateProfile(
    dto: UpdateWorkshopDto,
    workshopId?: string | null,
  ): Promise<WorkshopResponseDto> {
    const existing = await this.findWorkshop(workshopId);
    const data = this.buildPartialPersistenceData(dto);

    try {
      const workshop = await this.prisma.workshop.update({
        where: { id: existing.id },
        data,
      });

      return toWorkshopResponseDto(workshop);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('CNPJ ja cadastrado');
      }

      throw error;
    }
  }

  private buildPersistenceData(dto: UpsertWorkshopDto): WorkshopPersistenceData {
    return {
      tradeName: dto.tradeName.trim(),
      cnpj: normalizeCnpj(dto.cnpj),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
  }

  private buildPartialPersistenceData(dto: UpdateWorkshopDto): Partial<WorkshopPersistenceData> {
    return {
      ...(dto.tradeName !== undefined ? { tradeName: dto.tradeName.trim() } : {}),
      ...(dto.cnpj !== undefined ? { cnpj: normalizeCnpj(dto.cnpj) } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
  }

  private async findWorkshop(workshopId?: string | null) {
    const workshop = workshopId
      ? await this.prisma.workshop.findUnique({ where: { id: workshopId } })
      : await this.prisma.workshop.findFirst({ orderBy: { createdAt: 'asc' } });

    if (!workshop) {
      throw new NotFoundException('Oficina nao cadastrada');
    }

    return workshop;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
