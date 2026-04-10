import { Module } from '@nestjs/common';
import { ClientsModule } from 'src/clients/clients.module';
import { FinancialController } from 'src/financial/financial.controller';
import { FinancialService } from 'src/financial/financial.service';
import { ServiceOrdersModule } from 'src/service-orders/service-orders.module';

@Module({
  imports: [ClientsModule, ServiceOrdersModule],
  controllers: [FinancialController],
  providers: [FinancialService],
  exports: [FinancialService],
})
export class FinancialModule {}
