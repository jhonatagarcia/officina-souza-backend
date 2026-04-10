import { PartialType } from '@nestjs/swagger';
import { CreateBudgetDto } from 'src/budgets/dto/create-budget.dto';

export class UpdateBudgetDto extends PartialType(CreateBudgetDto) {}
