import { Module } from '@nestjs/common';
import { InventoryController } from 'src/inventory/inventory.controller';
import { InventoryService } from 'src/inventory/inventory.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
