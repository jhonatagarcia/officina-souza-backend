import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

interface StockCostLine {
  quantity: number;
  inventoryItem: {
    cost: Prisma.Decimal | number | string;
  } | null;
}

interface ServiceOrderStockCostSource {
  parts: StockCostLine[];
  budget: {
    items: StockCostLine[];
  } | null;
}

@Injectable()
export class StockOutValueService {
  calculateFromServiceOrders(serviceOrders: ServiceOrderStockCostSource[]): Prisma.Decimal {
    return serviceOrders.reduce((ordersTotal, serviceOrder) => {
      const sourceLines =
        serviceOrder.parts.length > 0 ? serviceOrder.parts : (serviceOrder.budget?.items ?? []);

      return ordersTotal.add(this.calculateLines(sourceLines));
    }, new Prisma.Decimal(0));
  }

  private calculateLines(lines: StockCostLine[]): Prisma.Decimal {
    return lines.reduce((linesTotal, line) => {
      if (!line.inventoryItem) {
        return linesTotal;
      }

      return linesTotal.add(new Prisma.Decimal(line.inventoryItem.cost).mul(line.quantity));
    }, new Prisma.Decimal(0));
  }
}
