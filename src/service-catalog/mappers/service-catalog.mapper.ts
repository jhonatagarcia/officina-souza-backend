import { Prisma } from '@prisma/client';
import { ServiceCatalogItemResponseDto } from 'src/service-catalog/dto/service-catalog-item-response.dto';

type ServiceCatalogItemModel = Prisma.ServiceCatalogItemGetPayload<Record<string, never>>;

export function toServiceCatalogItemResponseDto(
  item: ServiceCatalogItemModel,
): ServiceCatalogItemResponseDto {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    category: item.category,
    description: item.description,
    internalNotes: item.internalNotes,
    laborPrice: item.laborPrice,
    productPrice: item.productPrice,
    suggestedTotalPrice: item.suggestedTotalPrice,
    billingType: item.billingType,
    materialSource: item.materialSource,
    warrantyDays: item.warrantyDays,
    active: item.active,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
