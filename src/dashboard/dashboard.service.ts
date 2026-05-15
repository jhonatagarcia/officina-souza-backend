import { Injectable } from '@nestjs/common';
import { FinancialEntryType, FinancialStatus, Prisma, ServiceOrderStatus } from '@prisma/client';
import { requireWorkshopId } from 'src/common/tenant/tenant-context';
import type { RequestUser } from 'src/common/types/request-user.type';
import { getCurrentMonthRange } from 'src/common/utils/date-period.util';
import { StockOutValueService } from 'src/financial/services/stock-out-value.service';
import { isLowStock } from 'src/inventory/utils/inventory-stock-status.util';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockOutValueService: StockOutValueService,
  ) {}

  async getSummary(user: RequestUser) {
    const workshopId = requireWorkshopId(user);
    const currentMonth = getCurrentMonthRange();

    const [
      openOrders,
      inProgressOrders,
      readyForDelivery,
      pendingBudgets,
      lowStockItemsRaw,
      financialSummary,
      paidServiceOrders,
      unbilledPartsSummary,
    ] = await Promise.all([
      this.prisma.serviceOrder.count({ where: { workshopId, status: ServiceOrderStatus.ABERTA } }),
      this.prisma.serviceOrder.count({
        where: { workshopId, status: ServiceOrderStatus.EM_ANDAMENTO },
      }),
      this.prisma.serviceOrder.count({
        where: { workshopId, status: ServiceOrderStatus.FINALIZADA },
      }),
      this.prisma.budget.count({ where: { workshopId, status: 'PENDENTE' } }),
      this.prisma.inventoryItem.findMany({
        where: { workshopId },
        select: { id: true, name: true, quantity: true, minimumQuantity: true, internalCode: true },
      }),
      this.prisma.financialEntry.aggregate({
        _sum: { amount: true },
        where: {
          workshopId,
          type: FinancialEntryType.RECEIVABLE,
          dueDate: { gte: currentMonth.start, lt: currentMonth.end },
        },
      }),
      this.prisma.serviceOrder.findMany({
        where: {
          workshopId,
          financialEntries: {
            some: {
              type: FinancialEntryType.RECEIVABLE,
              status: FinancialStatus.PAGO,
            },
          },
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
                select: {
                  quantity: true,
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
      this.prisma.serviceOrderPart.aggregate({
        _sum: { totalPrice: true },
        where: {
          updatedAt: { gte: currentMonth.start, lt: currentMonth.end },
          serviceOrder: {
            workshopId,
            financialEntries: {
              none: {
                type: FinancialEntryType.RECEIVABLE,
              },
            },
          },
        },
      }),
    ]);

    const lowStockItems = lowStockItemsRaw.filter((item) =>
      isLowStock(item.quantity, item.minimumQuantity),
    );
    const monthRevenue = new Prisma.Decimal(financialSummary._sum.amount ?? 0).add(
      unbilledPartsSummary._sum.totalPrice ?? 0,
    );
    const stockOutValue = this.stockOutValueService.calculateFromServiceOrders(paidServiceOrders);

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
        monthRevenue,
        stockOutValue,
      },
      inventory: {
        lowStockCount: lowStockItems.length,
        lowStockItems,
      },
    };
  }
}
