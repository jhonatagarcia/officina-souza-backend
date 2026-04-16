import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(10)
  plate!: string;

  @ApiProperty()
  @IsString()
  brand!: string;

  @ApiProperty()
  @IsString()
  model!: string;

  @ApiProperty()
  @IsInt()
  @Min(1900)
  year!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fuel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
