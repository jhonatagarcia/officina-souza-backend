import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { BudgetsService } from 'src/budgets/budgets.service';
import { CreateBudgetDto } from 'src/budgets/dto/create-budget.dto';
import { UpdateBudgetDto } from 'src/budgets/dto/update-budget.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Role } from 'src/common/enums/role.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';
import type { RequestUser } from 'src/common/types/request-user.type';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'budgets', version: '1' })
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Cria orçamento' })
  create(@CurrentUser() user: RequestUser, @Body() createBudgetDto: CreateBudgetDto) {
    return this.budgetsService.create(user, createBudgetDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FINANCEIRO)
  findAll(@CurrentUser() user: RequestUser, @Query() pagination: PaginationQueryDto) {
    return this.budgetsService.findAll(user, pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FINANCEIRO)
  findOne(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.budgetsService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(user, id, updateBudgetDto);
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  approve(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.budgetsService.approve(user, id);
  }

  @Patch(':id/reject')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  reject(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.budgetsService.reject(user, id);
  }
}
