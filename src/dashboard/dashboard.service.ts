import { Injectable } from '@nestjs/common';
import { FinancialEntryType, FinancialStatus, Prisma, ServiceOrderStatus } from '@prisma/client';
import { isLowStock } from 'src/inventory/utils/inventory-stock-status.util';
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
      deliveredOrders,
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
      this.prisma.serviceOrder.findMany({
        where: {
          status: ServiceOrderStatus.ENTREGUE,
          deliveredAt: { gte: startOfMonth },
        },
        include: {
          parts: {
            select: {
              quantity: true,
              inventoryItem: {
                select: {
                  cost: true,
                },
              },
            },
          },
          budget: {
            include: {
              items: {
                where: {
                  inventoryItemId: {
                    not: null,
                  },
                },
                include: {
                  inventoryItem: {
                    select: {
                      cost: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const lowStockItems = lowStockItemsRaw.filter((item) =>
      isLowStock(item.quantity, item.minimumQuantity),
    );
    const stockOutValue = deliveredOrders.reduce((ordersTotal, serviceOrder) => {
      const partsCost = serviceOrder.parts.reduce(
        (partsTotal, part) =>
          partsTotal.add(new Prisma.Decimal(part.inventoryItem.cost).mul(part.quantity)),
        new Prisma.Decimal(0),
      );

      const budgetItemsCost = (serviceOrder.budget?.items ?? []).reduce(
        (itemsTotal, item) =>
          item.inventoryItem
            ? itemsTotal.add(new Prisma.Decimal(item.inventoryItem.cost).mul(item.quantity))
            : itemsTotal,
        new Prisma.Decimal(0),
      );

      return ordersTotal.add(partsCost).add(budgetItemsCost);
    }, new Prisma.Decimal(0));

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
        stockOutValue,
      },
      inventory: {
        lowStockCount: lowStockItems.length,
        lowStockItems,
      },
    };
  }
}
