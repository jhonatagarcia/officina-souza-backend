import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ServiceOrderStatus } from 'src/common/enums/service-order-status.enum';

export class UpdateServiceOrderStatusDto {
  @ApiProperty({ enum: ServiceOrderStatus })
  @IsEnum(ServiceOrderStatus)
  status!: ServiceOrderStatus;
}
