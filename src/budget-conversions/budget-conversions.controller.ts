import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Role } from 'src/common/enums/role.enum';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { BudgetConversionsService } from 'src/budget-conversions/budget-conversions.service';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'budgets', version: '1' })
export class BudgetConversionsController {
  constructor(private readonly budgetConversionsService: BudgetConversionsService) {}

  @Post(':id/convert-to-service-order')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Converte orçamento aprovado em ordem de serviço' })
  convertToServiceOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.budgetConversionsService.convertToServiceOrder(id);
  }
}
