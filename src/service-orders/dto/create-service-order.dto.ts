import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class CreateServiceOrderDto {
  @ApiProperty()
  @IsString()
  clientId!: string;

  @ApiProperty()
  @IsString()
  vehicleId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
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
