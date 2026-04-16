import { PartialType } from '@nestjs/swagger';
import { CreateServiceCatalogItemDto } from 'src/service-catalog/dto/create-service-catalog-item.dto';

export class UpdateServiceCatalogItemDto extends PartialType(CreateServiceCatalogItemDto) {}
