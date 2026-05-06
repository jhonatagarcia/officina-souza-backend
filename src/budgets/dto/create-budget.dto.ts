import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { BudgetItemType } from 'src/common/enums/budget-item-type.enum';

class CreateBudgetItemDto {
  @ApiProperty({ enum: BudgetItemType })
  @IsEnum(BudgetItemType)
  type!: BudgetItemType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceCatalogItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  inventoryItemId?: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  quantity!: number;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;
}

export class CreateBudgetDto {
  @ApiProperty()
  @IsUUID()
  clientId!: string;

  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  problemDescription!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount!: number;

  @ApiProperty({ type: [CreateBudgetItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetItemDto)
  items!: CreateBudgetItemDto[];
}

export { CreateBudgetItemDto };
