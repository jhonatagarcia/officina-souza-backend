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
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Role } from 'src/common/enums/role.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';
import type { RequestUser } from 'src/common/types/request-user.type';
import { CreateFinancialEntryDto } from 'src/financial/dto/create-financial-entry.dto';
import { PayFinancialEntryDto } from 'src/financial/dto/pay-financial-entry.dto';
import { UpdateFinancialEntryDto } from 'src/financial/dto/update-financial-entry.dto';
import { FinancialService } from 'src/financial/financial.service';

@ApiTags('Financial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'financial', version: '1' })
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  @Post()
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  @ApiOperation({ summary: 'Cria lançamento financeiro' })
  create(
    @CurrentUser() user: RequestUser,
    @Body() createFinancialEntryDto: CreateFinancialEntryDto,
  ) {
    return this.financialService.create(user, createFinancialEntryDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  findAll(@CurrentUser() user: RequestUser, @Query() pagination: PaginationQueryDto) {
    return this.financialService.findAll(user, pagination);
  }

  @Get('summary')
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  @ApiOperation({ summary: 'Resumo financeiro' })
  getSummary(@CurrentUser() user: RequestUser) {
    return this.financialService.getSummary(user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  findOne(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.financialService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() updateFinancialEntryDto: UpdateFinancialEntryDto,
  ) {
    return this.financialService.update(user, id, updateFinancialEntryDto);
  }

  @Patch(':id/pay')
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  pay(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payFinancialEntryDto: PayFinancialEntryDto,
  ) {
    return this.financialService.pay(user, id, payFinancialEntryDto);
  }
}
