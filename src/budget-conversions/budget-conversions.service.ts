import { Injectable } from '@nestjs/common';
import { BudgetsService } from 'src/budgets/budgets.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ServiceOrderResponseDto,
  toServiceOrderResponseDto,
} from 'src/service-orders/dto/service-order-response.dto';
import { buildServiceOrderNumber } from 'src/service-orders/utils/service-order-number.util';

@Injectable()
export class BudgetConversionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetsService: BudgetsService,
  ) {}

  async convertToServiceOrder(budgetId: string): Promise<ServiceOrderResponseDto> {
    const serviceOrder = await this.prisma.$transaction(async (tx) => {
      const budget = await this.budgetsService.assertCanConvert(budgetId, tx);

      const serviceOrder = await tx.serviceOrder.create({
        data: {
          orderNumber: buildServiceOrderNumber(),
          budgetId: budget.id,
          clientId: budget.clientId,
          vehicleId: budget.vehicleId,
          problemDescription: budget.problemDescription,
          notes: budget.notes,
        },
      });

      await this.budgetsService.markConverted(budget.id, tx);

      return serviceOrder;
    });

    return toServiceOrderResponseDto(serviceOrder);
  }
}
