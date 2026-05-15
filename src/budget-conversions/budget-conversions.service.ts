import { Injectable } from '@nestjs/common';
import { BudgetsService } from 'src/budgets/budgets.service';
import { ConvertBudgetResponseDto } from 'src/budget-conversions/dto/convert-budget-response.dto';
import { requireWorkshopId } from 'src/common/tenant/tenant-context';
import type { RequestUser } from 'src/common/types/request-user.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { buildServiceOrderNumber } from 'src/service-orders/utils/service-order-number.util';

@Injectable()
export class BudgetConversionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetsService: BudgetsService,
  ) {}

  async convertToServiceOrder(
    user: RequestUser,
    budgetId: string,
  ): Promise<ConvertBudgetResponseDto> {
    const workshopId = requireWorkshopId(user);

    return this.prisma.$transaction(async (tx) => {
      const budget = await this.budgetsService.assertCanConvert(workshopId, budgetId, tx);
      const orderNumber = await buildServiceOrderNumber(tx, workshopId);

      const serviceOrder = await tx.serviceOrder.create({
        data: {
          workshopId,
          orderNumber,
          budgetId: budget.id,
          clientId: budget.clientId,
          vehicleId: budget.vehicleId,
          problemDescription: budget.problemDescription,
          notes: budget.notes,
        },
      });

      const updatedBudget = await this.budgetsService.markConverted(workshopId, budget.id, tx);

      return {
        id: updatedBudget.id,
        convertedToServiceOrder: updatedBudget.convertedToServiceOrder,
        serviceOrder: {
          id: serviceOrder.id,
          orderNumber: serviceOrder.orderNumber,
          status: serviceOrder.status,
        },
      };
    });
  }
}
