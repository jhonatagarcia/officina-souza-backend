import { PartialType } from '@nestjs/swagger';
import { CreateVehicleDto } from 'src/vehicles/dto/create-vehicle.dto';

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}
