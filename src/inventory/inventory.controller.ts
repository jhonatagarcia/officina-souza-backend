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
import { CreateInventoryItemDto } from 'src/inventory/dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from 'src/inventory/dto/update-inventory-item.dto';
import { InventoryService } from 'src/inventory/inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'inventory', version: '1' })
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Cria item de estoque' })
  create(@CurrentUser() user: RequestUser, @Body() createInventoryItemDto: CreateInventoryItemDto) {
    return this.inventoryService.create(user, createInventoryItemDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FINANCEIRO)
  findAll(@CurrentUser() user: RequestUser, @Query() pagination: PaginationQueryDto) {
    return this.inventoryService.findAll(user, pagination);
  }

  @Get('alerts/low-stock')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  getLowStockAlerts(@CurrentUser() user: RequestUser) {
    return this.inventoryService.getLowStockAlerts(user);
  }

  @Get(':id/movements')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FINANCEIRO)
  getMovements(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.getMovements(user, id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FINANCEIRO)
  findOne(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() updateInventoryItemDto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.update(user, id, updateInventoryItemDto);
  }
}
