import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { FinancialEntryType } from 'src/common/enums/financial-entry-type.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';

export class CreateFinancialEntryDto {
  @ApiProperty({ enum: FinancialEntryType })
  @IsEnum(FinancialEntryType)
  type!: FinancialEntryType;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsString()
  category!: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiProperty()
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
