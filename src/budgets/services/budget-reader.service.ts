import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BudgetReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureExists(id: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: { serviceOrder: true },
    });

    if (!budget) {
      throw new NotFoundException('Orcamento nao encontrado');
    }

    return budget;
  }
}
