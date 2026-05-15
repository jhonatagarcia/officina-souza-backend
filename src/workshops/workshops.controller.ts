import { Body, Controller, Get, Param, ParseEnumPipe, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { FiscalFeatureCode } from 'src/common/enums/fiscal-feature-code.enum';
import { Role } from 'src/common/enums/role.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';
import type { RequestUser } from 'src/common/types/request-user.type';
import { UpdateWorkshopDto, UpsertWorkshopDto } from 'src/workshops/dto/upsert-workshop.dto';
import { WorkshopResponseDto } from 'src/workshops/dto/workshop-response.dto';
import {
  FiscalFeatureAccessResult,
  FiscalFeatureAccessService,
} from 'src/workshops/services/fiscal-feature-access.service';
import { WorkshopsService } from 'src/workshops/workshops.service';

@ApiTags('Workshop')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'workshop', version: '1' })
export class WorkshopsController {
  constructor(
    private readonly workshopsService: WorkshopsService,
    private readonly fiscalFeatureAccessService: FiscalFeatureAccessService,
  ) {}

  @Get('profile')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO, Role.FINANCEIRO)
  @ApiOperation({ summary: 'Retorna o perfil da oficina e seu estado fiscal' })
  @ApiResponse({ status: 200, type: WorkshopResponseDto })
  getProfile(@CurrentUser() user: RequestUser): Promise<WorkshopResponseDto> {
    return this.workshopsService.getProfile(user.workshopId);
  }

  @Put('profile')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cria ou atualiza o perfil da oficina' })
  @ApiResponse({ status: 200, type: WorkshopResponseDto })
  upsertProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpsertWorkshopDto,
  ): Promise<WorkshopResponseDto> {
    return this.workshopsService.upsertProfile(dto, user.workshopId);
  }

  @Patch('profile')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza parcialmente o perfil da oficina autenticada' })
  @ApiResponse({ status: 200, type: WorkshopResponseDto })
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateWorkshopDto,
  ): Promise<WorkshopResponseDto> {
    return this.workshopsService.updateProfile(dto, user.workshopId);
  }

  @Get('fiscal-features/:feature/access')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.FINANCEIRO)
  @ApiOperation({ summary: 'Consulta se uma funcionalidade fiscal pode ser usada pela oficina' })
  @ApiParam({ name: 'feature', enum: FiscalFeatureCode })
  getFiscalFeatureAccess(
    @CurrentUser() user: RequestUser,
    @Param('feature', new ParseEnumPipe(FiscalFeatureCode)) feature: FiscalFeatureCode,
  ): Promise<FiscalFeatureAccessResult> {
    return this.fiscalFeatureAccessService.getAccess(feature, user.workshopId);
  }
}
