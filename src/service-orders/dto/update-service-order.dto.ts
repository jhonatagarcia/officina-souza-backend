import { PartialType } from '@nestjs/swagger';
import { CreateServiceOrderDto } from 'src/service-orders/dto/create-service-order.dto';

export class UpdateServiceOrderDto extends PartialType(CreateServiceOrderDto) {}
