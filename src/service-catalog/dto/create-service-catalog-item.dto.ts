import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ServiceBillingType } from 'src/common/enums/service-billing-type.enum';
import { ServiceMaterialSource } from 'src/common/enums/service-material-source.enum';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateServiceCatalogItemDto {
  @ApiPropertyOptional({
    description: 'Codigo interno do servico. Quando omitido, o backend gera automaticamente.',
  })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  internalNotes?: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  laborPrice!: number;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  productPrice!: number;

  @ApiProperty({ enum: ServiceBillingType })
  @IsEnum(ServiceBillingType)
  billingType!: ServiceBillingType;

  @ApiProperty({ enum: ServiceMaterialSource })
  @IsEnum(ServiceMaterialSource)
  materialSource!: ServiceMaterialSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  warrantyDays?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
