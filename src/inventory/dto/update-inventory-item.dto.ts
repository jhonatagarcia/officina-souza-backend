import { PartialType } from '@nestjs/swagger';
import { CreateInventoryItemDto } from 'src/inventory/dto/create-inventory-item.dto';

export class UpdateInventoryItemDto extends PartialType(CreateInventoryItemDto) {}
