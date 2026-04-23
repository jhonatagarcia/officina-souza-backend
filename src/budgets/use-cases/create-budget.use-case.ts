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
      if (!serviceCatalogItem || !serviceCatalogItem.active || item.type !== BudgetItemType.LABOR) {
        throw new BadRequestException('Servico informado para o item do orcamento e invalido');
      }
    });

    return byId;
  }
}
