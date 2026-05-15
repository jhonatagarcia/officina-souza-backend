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
import { Role } from 'src/common/enums/role.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';
import type { RequestUser } from 'src/common/types/request-user.type';
import { CreateServiceCatalogItemDto } from 'src/service-catalog/dto/create-service-catalog-item.dto';
import { ListServiceCatalogItemsQueryDto } from 'src/service-catalog/dto/list-service-catalog-items-query.dto';
import { UpdateServiceCatalogItemDto } from 'src/service-catalog/dto/update-service-catalog-item.dto';
import { ServiceCatalogService } from 'src/service-catalog/service-catalog.service';

@ApiTags('Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'services', version: '1' })
export class ServiceCatalogController {
  constructor(private readonly serviceCatalogService: ServiceCatalogService) {}

  @Post()
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Cria servico do catalogo' })
  create(
    @CurrentUser() user: RequestUser,
    @Body() createServiceCatalogItemDto: CreateServiceCatalogItemDto,
  ) {
    return this.serviceCatalogService.create(user, createServiceCatalogItemDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO, Role.FINANCEIRO)
  findAll(@CurrentUser() user: RequestUser, @Query() query: ListServiceCatalogItemsQueryDto) {
    return this.serviceCatalogService.findAll(user, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO, Role.FINANCEIRO)
  findOne(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.serviceCatalogService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() updateServiceCatalogItemDto: UpdateServiceCatalogItemDto,
  ) {
    return this.serviceCatalogService.update(user, id, updateServiceCatalogItemDto);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  activate(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.serviceCatalogService.activate(user, id);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  deactivate(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.serviceCatalogService.deactivate(user, id);
  }
}
