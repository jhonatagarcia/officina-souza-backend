import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BudgetReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureExists(workshopId: string, id: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id_workshopId: { id, workshopId } },
      include: { serviceOrder: true },
    });

    if (!budget) {
      throw new NotFoundException('Orcamento nao encontrado');
    }

    return budget;
  }
}
