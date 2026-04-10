import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum } from 'class-validator';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';

export class PayFinancialEntryDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiProperty()
  @IsDateString()
  paidAt!: string;
}
