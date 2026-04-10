import { Injectable } from '@nestjs/common';
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
          create: createBudgetDto.items.map((item) => ({
            ...item,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }
}
