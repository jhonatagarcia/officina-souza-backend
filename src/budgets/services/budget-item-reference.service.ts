import { BadRequestException, Injectable } from '@nestjs/common';
import { BudgetItemType } from '@prisma/client';
import { CreateBudgetItemDto } from 'src/budgets/dto/create-budget.dto';
import { PrismaService } from 'src/prisma/prisma.service';

type BudgetItemInput = Pick<
  CreateBudgetItemDto,
  'type' | 'serviceCatalogItemId' | 'inventoryItemId'
>;

export interface BudgetItemReferences {
  serviceCatalogItems: Map<string, { id: string; code: string; active: boolean }>;
  inventoryItems: Map<string, { id: string }>;
}

@Injectable()
export class BudgetItemReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async loadAndValidate(items: BudgetItemInput[]): Promise<BudgetItemReferences> {
    const [serviceCatalogItems, inventoryItems] = await Promise.all([
      this.loadServiceCatalogItems(items),
      this.loadInventoryItems(items),
    ]);

    return { serviceCatalogItems, inventoryItems };
  }

  private async loadServiceCatalogItems(items: BudgetItemInput[]) {
    const serviceCatalogItemIds = this.uniqueDefinedValues(
      items.map((item) => item.serviceCatalogItemId),
    );

    if (!serviceCatalogItemIds.length) {
      return new Map<string, { id: string; code: string; active: boolean }>();
    }

    const serviceCatalogItems = await this.prisma.serviceCatalogItem.findMany({
      where: { id: { in: serviceCatalogItemIds } },
      select: { id: true, code: true, active: true },
    });

    const byId = new Map(serviceCatalogItems.map((item) => [item.id, item]));

    items.forEach((item) => {
      if (!item.serviceCatalogItemId) {
        return;
      }

      const serviceCatalogItem = byId.get(item.serviceCatalogItemId);
      if (
        !serviceCatalogItem ||
        !serviceCatalogItem.active ||
        (item.type !== BudgetItemType.LABOR && item.type !== BudgetItemType.LABOR_AND_PART)
      ) {
        throw new BadRequestException('Servico informado para o item do orcamento e invalido');
      }
    });

    return byId;
  }

  private async loadInventoryItems(items: BudgetItemInput[]) {
    const inventoryItemIds = this.uniqueDefinedValues(items.map((item) => item.inventoryItemId));

    if (!inventoryItemIds.length) {
      return new Map<string, { id: string }>();
    }

    const inventoryItems = await this.prisma.inventoryItem.findMany({
      where: { id: { in: inventoryItemIds } },
      select: { id: true },
    });

    const byId = new Map(inventoryItems.map((item) => [item.id, item]));

    items.forEach((item) => {
      if (item.type !== BudgetItemType.LABOR_AND_PART && item.type !== BudgetItemType.PART) {
        return;
      }

      if (!item.inventoryItemId || !byId.get(item.inventoryItemId)) {
        throw new BadRequestException(
          'Peca ou produto informado para o item do orcamento e invalido',
        );
      }
    });

    return byId;
  }

  private uniqueDefinedValues(values: Array<string | undefined>) {
    return [...new Set(values.filter((value): value is string => Boolean(value)))];
  }
}
