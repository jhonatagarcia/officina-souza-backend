import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export class CreateServiceOrderDto {
  @ApiProperty()
  @IsUUID()
  clientId!: string;

  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  mechanicId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  problemDescription!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  servicesPerformed?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleChecklist?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  expectedDeliveryAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
