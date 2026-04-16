import { Prisma } from '@prisma/client';
import { ServiceBillingType } from 'src/common/enums/service-billing-type.enum';
import { ServiceMaterialSource } from 'src/common/enums/service-material-source.enum';

export interface ServiceCatalogItemResponseDto {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
  internalNotes: string | null;
  laborPrice: Prisma.Decimal;
  productPrice: Prisma.Decimal;
  suggestedTotalPrice: Prisma.Decimal;
  billingType: ServiceBillingType;
  materialSource: ServiceMaterialSource;
  warrantyDays: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
