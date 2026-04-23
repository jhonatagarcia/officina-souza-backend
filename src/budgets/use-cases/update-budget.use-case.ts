import { BadRequestException, Injectable } from '@nestjs/common';
import { BudgetItemType, BudgetStatus } from '@prisma/client';
import { UpdateBudgetDto } from 'src/budgets/dto/update-budget.dto';
import { BudgetReaderService } from 'src/budgets/services/budget-reader.service';
import { BudgetReferenceValidatorService } from 'src/budgets/services/budget-reference-validator.service';
import { BudgetTotalsService } from 'src/budgets/services/budget-totals.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UpdateBudgetUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetReader: BudgetReaderService,
    private readonly referenceValidator: BudgetReferenceValidatorService,
    private readonly totalsService: BudgetTotalsService,
  ) {}

  async execute(id: string, updateBudgetDto: UpdateBudgetDto) {
    const budget = await this.budgetReader.ensureExists(id);

    if (budget.status !== BudgetStatus.PENDENTE) {
      throw new BadRequestException('Apenas orcamentos pendentes podem ser atualizados');
    }

    if (updateBudgetDto.clientId || updateBudgetDto.vehicleId) {
      await this.referenceValidator.validate(
        updateBudgetDto.clientId ?? budget.clientId,
        updateBudgetDto.vehicleId ?? budget.vehicleId,
      );
    }

    const totals = updateBudgetDto.items
      ? this.totalsService.calculate(
          updateBudgetDto.items,
          updateBudgetDto.discount ?? Number(budget.discount),
        )
      : undefined;
    const serviceCatalogItems = updateBudgetDto.items
      ? await this.loadServiceCatalogItems(updateBudgetDto.items)
      : new Map<string, { id: string; code: string; active: boolean }>();

    return this.prisma.$transaction(async (tx) => {
      if (updateBudgetDto.items) {
        await tx.budgetItem.deleteMany({ where: { budgetId: id } });
      }

      return tx.budget.update({
        where: { id },
        data: {
          clientId: updateBudgetDto.clientId,
          vehicleId: updateBudgetDto.vehicleId,
          problemDescription: updateBudgetDto.problemDescription,
          notes: updateBudgetDto.notes,
          discount: updateBudgetDto.discount,
          subtotal: totals?.subtotal,
          total: totals?.total,
          items: updateBudgetDto.items
            ? {
                create: updateBudgetDto.items.map((item) => ({
                  ...item,
                  serviceCode: item.serviceCatalogItemId
                    ? serviceCatalogItems.get(item.serviceCatalogItemId)?.code
                    : null,
                  totalPrice: item.quantity * item.unitPrice,
                })),
              }
            : undefined,
        },
        include: { items: true },
      });
    });
  }

  private async loadServiceCatalogItems(items: NonNullable<UpdateBudgetDto['items']>) {
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
