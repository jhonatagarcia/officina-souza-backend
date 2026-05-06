import { Prisma } from '@prisma/client';

interface FinancialClientSummaryDto {
  id: string;
  name: string;
  document: string | null;
}

interface FinancialServiceOrderSummaryDto {
  id: string;
  orderNumber: string;
  status: string;
}

export interface FinancialEntryResponseDto {
  id: string;
  type: string;
  description: string;
  category: string;
  amount: Prisma.Decimal;
  dueDate: Date;
  paidAt: Date | null;
  paymentMethod: string | null;
  status: string;
  clientId: string | null;
  serviceOrderId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  client: FinancialClientSummaryDto | null;
  serviceOrder: FinancialServiceOrderSummaryDto | null;
}

type FinancialEntryModel = Prisma.FinancialEntryGetPayload<{
  include: { client: true; serviceOrder: true };
}>;

export function toFinancialEntryResponseDto(entry: FinancialEntryModel): FinancialEntryResponseDto {
  return {
    id: entry.id,
    type: entry.type,
    description: entry.description,
    category: entry.category,
    amount: entry.amount,
    dueDate: entry.dueDate,
    paidAt: entry.paidAt,
    paymentMethod: entry.paymentMethod,
    status: entry.status,
    clientId: entry.clientId,
    serviceOrderId: entry.serviceOrderId,
    notes: entry.notes,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    client: entry.client
      ? {
          id: entry.client.id,
          name: entry.client.name,
          document: entry.client.document,
        }
      : null,
    serviceOrder: entry.serviceOrder
      ? {
          id: entry.serviceOrder.id,
          orderNumber: entry.serviceOrder.orderNumber,
          status: entry.serviceOrder.status,
        }
      : null,
  };
}
