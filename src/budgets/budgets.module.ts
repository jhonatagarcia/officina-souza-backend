import { Module } from '@nestjs/common';
import { ClientsModule } from 'src/clients/clients.module';
import { BudgetsController } from 'src/budgets/budgets.controller';
import { BudgetReaderService } from 'src/budgets/services/budget-reader.service';
import { BudgetReferenceValidatorService } from 'src/budgets/services/budget-reference-validator.service';
import { BudgetTotalsService } from 'src/budgets/services/budget-totals.service';
import { BudgetsService } from 'src/budgets/budgets.service';
import { ApproveBudgetUseCase } from 'src/budgets/use-cases/approve-budget.use-case';
import { CreateBudgetUseCase } from 'src/budgets/use-cases/create-budget.use-case';
import { RejectBudgetUseCase } from 'src/budgets/use-cases/reject-budget.use-case';
import { UpdateBudgetUseCase } from 'src/budgets/use-cases/update-budget.use-case';
import { VehiclesModule } from 'src/vehicles/vehicles.module';

@Module({
  imports: [ClientsModule, VehiclesModule],
  controllers: [BudgetsController],
  providers: [
    BudgetsService,
    BudgetReaderService,
    BudgetReferenceValidatorService,
    BudgetTotalsService,
    CreateBudgetUseCase,
    UpdateBudgetUseCase,
    ApproveBudgetUseCase,
    RejectBudgetUseCase,
  ],
  exports: [BudgetsService],
})
export class BudgetsModule {}
