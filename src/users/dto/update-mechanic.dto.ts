import { PartialType } from '@nestjs/swagger';
import { CreateMechanicDto } from 'src/users/dto/create-mechanic.dto';

export class UpdateMechanicDto extends PartialType(CreateMechanicDto) {}
