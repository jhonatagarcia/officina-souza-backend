import { BadRequestException, Injectable } from '@nestjs/common';
import { BudgetItemType } from '@prisma/client';
import { CreateBudgetDto } from 'src/budgets/dto/create-budget.dto';
import { BudgetReferenceValidatorService } from 'src/budgets/services/budget-reference-validator.service';
import { BudgetTotalsService } from 'src/budgets/services/budget-totals.service';
import { buildBudgetCode } from 'src/budgets/utils/budget-code.util';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CreateBudgetUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referenceValidator: BudgetReferenceValidatorService,
    private readonly totalsService: BudgetTotalsService,
  ) {}

  async execute(createBudgetDto: CreateBudgetDto) {
    await this.referenceValidator.validate(createBudgetDto.clientId, createBudgetDto.vehicleId);
    const serviceCatalogItems = await this.loadServiceCatalogItems(createBudgetDto.items);
    const inventoryItems = await this.loadInventoryItems(createBudgetDto.items);
    const totals = this.totalsService.calculate(createBudgetDto.items, createBudgetDto.discount);

    return this.prisma.budget.create({
      data: {
        code: buildBudgetCode(),
        clientId: createBudgetDto.clientId,
        vehicleId: createBudgetDto.vehicleId,
        problemDescription: createBudgetDto.problemDescription,
        notes: createBudgetDto.notes,
        subtotal: totals.subtotal,
        discount: createBudgetDto.discount,
        total: totals.total,
        items: {
          create: createBudgetDto.items.map((item) => {
            const serviceCatalogItem = item.serviceCatalogItemId ? serviceCatalogItems.get(item.serviceCatalogItemId) : null;

            return {
              ...item,
              serviceCode: serviceCatalogItem?.code,
              inventoryItemId: inventoryItems.get(item.inventoryItemId ?? '')?.id ?? null,
              totalPrice: item.quantity * item.unitPrice,
            };
          }),
        },
      },
      include: {
        items: true,
      },
    });
  }

  private async loadServiceCatalogItems(items: CreateBudgetDto['items']) {
    const serviceCatalogItemIds = [
      ...new Set(
        items
          .map((item) => item.serviceCatalogItemId)
          .filter((serviceCatalogItemId): serviceCatalogItemId is string => Boolean(serviceCatalogItemId)),
      ),
    ];

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

  private async loadInventoryItems(items: CreateBudgetDto['items']) {
    const inventoryItemIds = [
      ...new Set(
        items
          .map((item) => item.inventoryItemId)
          .filter((inventoryItemId): inventoryItemId is string => Boolean(inventoryItemId)),
      ),
    ];

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
        throw new BadRequestException('Peca ou produto informado para o item do orcamento e invalido');
      }
    });

    return byId;
  }
}
