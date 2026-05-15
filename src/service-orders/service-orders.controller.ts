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
  create(@CurrentUser() user: RequestUser, @Body() createServiceOrderDto: CreateServiceOrderDto) {
    return this.serviceOrdersService.create(user, createServiceOrderDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO, Role.FINANCEIRO)
  findAll(@CurrentUser() user: RequestUser, @Query() pagination: PaginationQueryDto) {
    return this.serviceOrdersService.findAll(user, pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO, Role.FINANCEIRO)
  findOne(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.serviceOrdersService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() updateServiceOrderDto: UpdateServiceOrderDto,
  ) {
    return this.serviceOrdersService.update(user, id, updateServiceOrderDto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() updateStatusDto: UpdateServiceOrderStatusDto,
  ) {
    return this.serviceOrdersService.updateStatus(user, id, updateStatusDto);
  }

  @Post(':id/parts')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  addPart(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addPartDto: AddServiceOrderPartDto,
  ) {
    return this.serviceOrdersService.addPart(user, id, addPartDto);
  }

  @Get(':id/parts')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO, Role.FINANCEIRO)
  listParts(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.serviceOrdersService.listParts(user, id);
  }
}
