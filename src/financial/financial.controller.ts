import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Role } from 'src/common/enums/role.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';
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
  create(@Body() createFinancialEntryDto: CreateFinancialEntryDto) {
    return this.financialService.create(createFinancialEntryDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.financialService.findAll(pagination);
  }

  @Get('summary')
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  @ApiOperation({ summary: 'Resumo financeiro' })
  getSummary() {
    return this.financialService.getSummary();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  findOne(@Param('id') id: string) {
    return this.financialService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  update(@Param('id') id: string, @Body() updateFinancialEntryDto: UpdateFinancialEntryDto) {
    return this.financialService.update(id, updateFinancialEntryDto);
  }

  @Patch(':id/pay')
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  pay(@Param('id') id: string, @Body() payFinancialEntryDto: PayFinancialEntryDto) {
    return this.financialService.pay(id, payFinancialEntryDto);
  }
}
