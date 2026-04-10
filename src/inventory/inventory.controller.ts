import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Role } from 'src/common/enums/role.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';
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
  create(@Body() createInventoryItemDto: CreateInventoryItemDto) {
    return this.inventoryService.create(createInventoryItemDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FINANCEIRO)
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.inventoryService.findAll(pagination);
  }

  @Get('alerts/low-stock')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  getLowStockAlerts() {
    return this.inventoryService.getLowStockAlerts();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FINANCEIRO)
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  update(@Param('id') id: string, @Body() updateInventoryItemDto: UpdateInventoryItemDto) {
    return this.inventoryService.update(id, updateInventoryItemDto);
  }
}
