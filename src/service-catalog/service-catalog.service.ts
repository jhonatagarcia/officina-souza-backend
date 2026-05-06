import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ServiceBillingType } from 'src/common/enums/service-billing-type.enum';
import { ServiceMaterialSource } from 'src/common/enums/service-material-source.enum';
import { buildSafeOrderBy } from 'src/common/utils/order-by.util';
import { buildPaginationMeta, PaginatedResponse } from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateServiceCatalogItemDto } from 'src/service-catalog/dto/create-service-catalog-item.dto';
import { ListServiceCatalogItemsQueryDto } from 'src/service-catalog/dto/list-service-catalog-items-query.dto';
import { ServiceCatalogItemResponseDto } from 'src/service-catalog/dto/service-catalog-item-response.dto';
import { UpdateServiceCatalogItemDto } from 'src/service-catalog/dto/update-service-catalog-item.dto';
import { toServiceCatalogItemResponseDto } from 'src/service-catalog/mappers/service-catalog.mapper';

const SERVICE_CATALOG_ORDERABLE_FIELDS = new Set([
  'code',
  'name',
  'category',
  'suggestedTotalPrice',
  'createdAt',
  'updatedAt',
] as const);

interface ServiceCatalogRuleSnapshot {
  laborPrice: Prisma.Decimal;
  productPrice: Prisma.Decimal;
  billingType: ServiceBillingType;
  materialSource: ServiceMaterialSource;
}

@Injectable()
export class ServiceCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createServiceCatalogItemDto: CreateServiceCatalogItemDto,
  ): Promise<ServiceCatalogItemResponseDto> {
    const normalizedData = this.normalizeInput(createServiceCatalogItemDto);
    const code = normalizedData.code ?? (await this.generateInternalCode());

    await this.ensureUniqueCode(code);
    await this.ensureUniqueNameWithinCategory(normalizedData.name, normalizedData.category);

    const priceSnapshot = this.buildRuleSnapshot({
      laborPrice: normalizedData.laborPrice,
      productPrice: normalizedData.productPrice,
      billingType: normalizedData.billingType,
      materialSource: normalizedData.materialSource,
    });
    this.validateBusinessRules(priceSnapshot);

    const item = await this.prisma.serviceCatalogItem.create({
      data: {
        ...normalizedData,
        code,
        suggestedTotalPrice: this.calculateSuggestedTotalPrice(
          priceSnapshot.laborPrice,
          priceSnapshot.productPrice,
        ),
      },
    });

    return toServiceCatalogItemResponseDto(item);
  }

  async findAll(
    query: ListServiceCatalogItemsQueryDto,
  ): Promise<PaginatedResponse<ServiceCatalogItemResponseDto>> {
    const where: Prisma.ServiceCatalogItemWhereInput = {
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.category
        ? {
            category: {
              equals: query.category.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.serviceCatalogItem.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: buildSafeOrderBy(
          SERVICE_CATALOG_ORDERABLE_FIELDS,
          query.sortBy,
          'createdAt',
          query.sortOrder,
        ),
      }),
      this.prisma.serviceCatalogItem.count({ where }),
    ]);

    return {
      data: data.map(toServiceCatalogItemResponseDto),
      meta: buildPaginationMeta(query, total),
    };
  }

  async findOne(id: string): Promise<ServiceCatalogItemResponseDto> {
    const item = await this.prisma.serviceCatalogItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Servico nao encontrado');
    }

    return toServiceCatalogItemResponseDto(item);
  }

  async update(
    id: string,
    updateServiceCatalogItemDto: UpdateServiceCatalogItemDto,
  ): Promise<ServiceCatalogItemResponseDto> {
    const existing = await this.ensureExists(id);
    const normalizedData = this.normalizeInput(updateServiceCatalogItemDto);

    if (normalizedData.code) {
      await this.ensureUniqueCode(normalizedData.code, id);
    }

    const mergedSnapshot = this.buildRuleSnapshot({
      laborPrice: normalizedData.laborPrice ?? existing.laborPrice,
      productPrice: normalizedData.productPrice ?? existing.productPrice,
      billingType: normalizedData.billingType ?? existing.billingType,
      materialSource: normalizedData.materialSource ?? existing.materialSource,
    });

    const nextName = normalizedData.name ?? existing.name;
    const nextCategory = normalizedData.category ?? existing.category;

    if (
      nextName.localeCompare(existing.name, undefined, { sensitivity: 'accent' }) !== 0 ||
      nextCategory.localeCompare(existing.category, undefined, { sensitivity: 'accent' }) !== 0
    ) {
      await this.ensureUniqueNameWithinCategory(nextName, nextCategory, id);
    }

    this.validateBusinessRules(mergedSnapshot);

    const item = await this.prisma.serviceCatalogItem.update({
      where: { id },
      data: {
        ...normalizedData,
        suggestedTotalPrice: this.calculateSuggestedTotalPrice(
          mergedSnapshot.laborPrice,
          mergedSnapshot.productPrice,
        ),
      },
    });

    return toServiceCatalogItemResponseDto(item);
  }

  async activate(id: string): Promise<ServiceCatalogItemResponseDto> {
    await this.ensureExists(id);

    const item = await this.prisma.serviceCatalogItem.update({
      where: { id },
      data: { active: true },
    });

    return toServiceCatalogItemResponseDto(item);
  }

  async deactivate(id: string): Promise<ServiceCatalogItemResponseDto> {
    await this.ensureExists(id);

    const item = await this.prisma.serviceCatalogItem.update({
      where: { id },
      data: { active: false },
    });

    return toServiceCatalogItemResponseDto(item);
  }

  async ensureExists(id: string) {
    const item = await this.prisma.serviceCatalogItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Servico nao encontrado');
    }

    return item;
  }

  private normalizeInput<
    T extends Partial<
      Pick<
        CreateServiceCatalogItemDto,
        'code' | 'name' | 'category' | 'description' | 'internalNotes'
      >
    >,
  >(input: T): T {
    return {
      ...input,
      ...(input.code ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.category ? { category: input.category.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || undefined }
        : {}),
      ...(input.internalNotes !== undefined
        ? { internalNotes: input.internalNotes?.trim() || undefined }
        : {}),
    };
  }

  private buildRuleSnapshot(input: {
    laborPrice: number | Prisma.Decimal;
    productPrice: number | Prisma.Decimal;
    billingType: ServiceBillingType;
    materialSource: ServiceMaterialSource;
  }): ServiceCatalogRuleSnapshot {
    return {
      laborPrice: new Prisma.Decimal(input.laborPrice),
      productPrice: new Prisma.Decimal(input.productPrice),
      billingType: input.billingType,
      materialSource: input.materialSource,
    };
  }

  private validateBusinessRules(snapshot: ServiceCatalogRuleSnapshot) {
    if (snapshot.laborPrice.isNegative() || snapshot.productPrice.isNegative()) {
      throw new BadRequestException('Os valores do servico nao podem ser negativos');
    }

    // LABOR_ONLY representa servicos cobrados apenas por mao de obra.
    if (snapshot.billingType === ServiceBillingType.LABOR_ONLY) {
      if (!snapshot.productPrice.isZero()) {
        throw new BadRequestException('Servicos LABOR_ONLY devem ter productPrice igual a zero');
      }

      if (snapshot.materialSource === ServiceMaterialSource.SHOP_SUPPLIES) {
        throw new BadRequestException(
          'Servicos LABOR_ONLY nao podem usar materialSource SHOP_SUPPLIES',
        );
      }
    }

    if (snapshot.materialSource === ServiceMaterialSource.NO_PARTS_REQUIRED) {
      if (!snapshot.productPrice.isZero()) {
        throw new BadRequestException(
          'Servicos sem necessidade de pecas devem ter productPrice igual a zero',
        );
      }

      if (snapshot.billingType === ServiceBillingType.PARTS_AND_LABOR) {
        throw new BadRequestException(
          'Servicos PARTS_AND_LABOR nao podem usar materialSource NO_PARTS_REQUIRED',
        );
      }
    }
  }

  private calculateSuggestedTotalPrice(laborPrice: Prisma.Decimal, productPrice: Prisma.Decimal) {
    return laborPrice.plus(productPrice);
  }

  private async ensureUniqueCode(code: string, excludeId?: string) {
    const existing = await this.prisma.serviceCatalogItem.findFirst({
      where: {
        code,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });

    if (existing) {
      throw new ConflictException('Ja existe um servico com este codigo');
    }
  }

  private async generateInternalCode() {
    const lastGeneratedItem = await this.prisma.serviceCatalogItem.findFirst({
      where: {
        code: {
          startsWith: 'SRV-',
        },
      },
      orderBy: {
        code: 'desc',
      },
    });

    const lastSequence = lastGeneratedItem
      ? Number(lastGeneratedItem.code.replace(/^SRV-/, ''))
      : 0;
    const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

    return `SRV-${nextSequence.toString().padStart(6, '0')}`;
  }

  private async ensureUniqueNameWithinCategory(name: string, category: string, excludeId?: string) {
    const existing = await this.prisma.serviceCatalogItem.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        category: { equals: category, mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });

    if (existing) {
      throw new ConflictException('Ja existe um servico com este nome na categoria informada');
    }
  }
}
