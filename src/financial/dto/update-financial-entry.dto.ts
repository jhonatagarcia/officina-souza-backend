import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { FinancialEntryType } from 'src/common/enums/financial-entry-type.enum';
import { FinancialStatus } from 'src/common/enums/financial-status.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';

export class UpdateFinancialEntryDto {
  @ApiPropertyOptional({ enum: FinancialEntryType })
  @IsOptional()
  @IsEnum(FinancialEntryType)
  type?: FinancialEntryType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ enum: FinancialStatus })
  @IsOptional()
  @IsEnum(FinancialStatus)
  status?: FinancialStatus;

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
