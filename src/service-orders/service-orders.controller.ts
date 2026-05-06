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
import { Roles } from 'src/common/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Role } from 'src/common/enums/role.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AddServiceOrderPartDto } from 'src/service-orders/dto/add-service-order-part.dto';
import { CreateServiceOrderDto } from 'src/service-orders/dto/create-service-order.dto';
import { UpdateServiceOrderStatusDto } from 'src/service-orders/dto/update-service-order-status.dto';
import { UpdateServiceOrderDto } from 'src/service-orders/dto/update-service-order.dto';
import { ServiceOrdersService } from 'src/service-orders/service-orders.service';

@ApiTags('Service Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'service-orders', version: '1' })
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Cria ordem de serviço' })
  create(@Body() createServiceOrderDto: CreateServiceOrderDto) {
    return this.serviceOrdersService.create(createServiceOrderDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO, Role.FINANCEIRO)
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.serviceOrdersService.findAll(pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO, Role.FINANCEIRO)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.serviceOrdersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateServiceOrderDto: UpdateServiceOrderDto,
  ) {
    return this.serviceOrdersService.update(id, updateServiceOrderDto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateServiceOrderStatusDto,
  ) {
    return this.serviceOrdersService.updateStatus(id, updateStatusDto);
  }

  @Post(':id/parts')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  addPart(@Param('id', ParseUUIDPipe) id: string, @Body() addPartDto: AddServiceOrderPartDto) {
    return this.serviceOrdersService.addPart(id, addPartDto);
  }

  @Get(':id/parts')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO, Role.FINANCEIRO)
  listParts(@Param('id', ParseUUIDPipe) id: string) {
    return this.serviceOrdersService.listParts(id);
  }
}
