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
import { Role } from 'src/common/enums/role.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CreateMechanicDto } from 'src/users/dto/create-mechanic.dto';
import { ListUsersQueryDto } from 'src/users/dto/list-users-query.dto';
import { UpdateMechanicDto } from 'src/users/dto/update-mechanic.dto';
import { UsersService } from 'src/users/users.service';

@ApiTags('Mechanics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'mechanics', version: '1' })
export class MechanicsController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cria mecânico interno' })
  create(@Body() createMechanicDto: CreateMechanicDto) {
    return this.usersService.createMechanic(createMechanicDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lista mecânicos' })
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAllMechanics(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtém mecânico' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findMechanicById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza mecânico' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateMechanicDto: UpdateMechanicDto) {
    return this.usersService.updateMechanic(id, updateMechanicDto);
  }
}
