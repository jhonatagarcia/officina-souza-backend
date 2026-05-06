import { BadRequestException, Injectable } from '@nestjs/common';
import { BudgetStatus, Prisma } from '@prisma/client';
import { UpdateBudgetDto } from 'src/budgets/dto/update-budget.dto';
import { BudgetItemReferenceService } from 'src/budgets/services/budget-item-reference.service';
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
    private readonly itemReferenceService: BudgetItemReferenceService,
    private readonly totalsService: BudgetTotalsService,
  ) {}

  async execute(
    id: string,
    updateBudgetDto: UpdateBudgetDto,
  ): Promise<Prisma.BudgetGetPayload<{ include: { items: true } }>> {
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
    const itemReferences = updateBudgetDto.items
      ? await this.itemReferenceService.loadAndValidate(updateBudgetDto.items)
      : undefined;

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
                    ? itemReferences?.serviceCatalogItems.get(item.serviceCatalogItemId)?.code
                    : null,
                  inventoryItemId:
                    itemReferences?.inventoryItems.get(item.inventoryItemId ?? '')?.id ?? null,
                  totalPrice: item.quantity * item.unitPrice,
                })),
              }
            : undefined,
        },
        include: { items: true },
      });
    });
  }
}
