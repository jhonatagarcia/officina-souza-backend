import { Module } from '@nestjs/common';
import { ServiceCatalogController } from 'src/service-catalog/service-catalog.controller';
import { ServiceCatalogService } from 'src/service-catalog/service-catalog.service';

@Module({
  controllers: [ServiceCatalogController],
  providers: [ServiceCatalogService],
  exports: [ServiceCatalogService],
})
export class ServiceCatalogModule {}
