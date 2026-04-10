import { Injectable } from '@nestjs/common';
import { FinancialEntryType, FinancialStatus, Prisma, ServiceOrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      openOrders,
      inProgressOrders,
      readyForDelivery,
      pendingBudgets,
      lowStockItemsRaw,
      financialSummary,
    ] = await Promise.all([
      this.prisma.serviceOrder.count({ where: { status: ServiceOrderStatus.ABERTA } }),
      this.prisma.serviceOrder.count({ where: { status: ServiceOrderStatus.EM_ANDAMENTO } }),
      this.prisma.serviceOrder.count({ where: { status: ServiceOrderStatus.FINALIZADA } }),
      this.prisma.budget.count({ where: { status: 'PENDENTE' } }),
      this.prisma.inventoryItem.findMany({
        select: { id: true, name: true, quantity: true, minimumQuantity: true, internalCode: true },
      }),
      this.prisma.financialEntry.aggregate({
        _sum: { amount: true },
        where: {
          type: FinancialEntryType.RECEIVABLE,
          status: FinancialStatus.PAGO,
          paidAt: { gte: startOfMonth },
        },
      }),
    ]);

    const lowStockItems = lowStockItemsRaw.filter((item) => item.quantity <= item.minimumQuantity);

    return {
      serviceOrders: {
        open: openOrders,
        inProgress: inProgressOrders,
        readyForDelivery,
      },
      budgets: {
        pending: pendingBudgets,
      },
      financial: {
        monthRevenue: financialSummary._sum.amount ?? new Prisma.Decimal(0),
      },
      inventory: {
        lowStockCount: lowStockItems.length,
        lowStockItems,
      },
    };
  }
}
