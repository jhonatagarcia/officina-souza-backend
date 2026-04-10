import { BadRequestException, Injectable } from '@nestjs/common';
import { BudgetStatus } from '@prisma/client';
import { BudgetReaderService } from 'src/budgets/services/budget-reader.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ApproveBudgetUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetReader: BudgetReaderService,
  ) {}

  async execute(id: string) {
    const budget = await this.budgetReader.ensureExists(id);

    if (budget.status !== BudgetStatus.PENDENTE) {
      throw new BadRequestException('Only pending budgets can be approved');
    }

    return this.prisma.budget.update({
      where: { id },
      data: {
        status: BudgetStatus.APROVADO,
        approvedAt: new Date(),
      },
    });
  }
}
