import { Module } from '@nestjs/common';
import { ClientsModule } from 'src/clients/clients.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { ServiceOrdersController } from 'src/service-orders/service-orders.controller';
import { ServiceOrderReferenceValidatorService } from 'src/service-orders/services/service-order-reference-validator.service';
import { ServiceOrdersService } from 'src/service-orders/service-orders.service';
import { AddServiceOrderPartUseCase } from 'src/service-orders/use-cases/add-service-order-part.use-case';
import { CreateServiceOrderUseCase } from 'src/service-orders/use-cases/create-service-order.use-case';
import { UpdateServiceOrderStatusUseCase } from 'src/service-orders/use-cases/update-service-order-status.use-case';
import { UsersModule } from 'src/users/users.module';
import { VehiclesModule } from 'src/vehicles/vehicles.module';

@Module({
  imports: [ClientsModule, VehiclesModule, InventoryModule, UsersModule],
  controllers: [ServiceOrdersController],
  providers: [
    ServiceOrdersService,
    ServiceOrderReferenceValidatorService,
    CreateServiceOrderUseCase,
    AddServiceOrderPartUseCase,
    UpdateServiceOrderStatusUseCase,
  ],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}
