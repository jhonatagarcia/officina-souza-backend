import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateBudgetItemDto } from 'src/budgets/dto/create-budget.dto';

export interface BudgetTotals {
  subtotal: number;
  total: number;
}

@Injectable()
export class BudgetTotalsService {
  calculate(items: CreateBudgetItemDto[], discount: number): BudgetTotals {
    const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

    if (discount > subtotal) {
      throw new BadRequestException('O desconto nao pode ser maior que o subtotal');
    }

    return {
      subtotal,
      total: subtotal - discount,
    };
  }
}
