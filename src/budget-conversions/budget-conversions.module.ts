import { Module } from '@nestjs/common';
import { BudgetsModule } from 'src/budgets/budgets.module';
import { BudgetConversionsController } from 'src/budget-conversions/budget-conversions.controller';
import { BudgetConversionsService } from 'src/budget-conversions/budget-conversions.service';

@Module({
  imports: [BudgetsModule],
  controllers: [BudgetConversionsController],
  providers: [BudgetConversionsService],
  exports: [BudgetConversionsService],
})
export class BudgetConversionsModule {}
