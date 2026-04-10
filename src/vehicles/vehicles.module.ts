import { Module } from '@nestjs/common';
import { ClientsModule } from 'src/clients/clients.module';
import { VehiclesController } from 'src/vehicles/vehicles.controller';
import { VehiclesService } from 'src/vehicles/vehicles.service';

@Module({
  imports: [ClientsModule],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
