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

  async execute(workshopId: string, id: string) {
    const budget = await this.budgetReader.ensureExists(workshopId, id);

    if (budget.status !== BudgetStatus.PENDENTE) {
      throw new BadRequestException('Apenas orcamentos pendentes podem ser aprovados');
    }

    return this.prisma.budget.update({
      where: { id_workshopId: { id, workshopId } },
      data: {
        status: BudgetStatus.APROVADO,
        approvedAt: new Date(),
      },
    });
  }
}
