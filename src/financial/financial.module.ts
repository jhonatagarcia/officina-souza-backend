import { Module } from '@nestjs/common';
import { ClientsModule } from 'src/clients/clients.module';
import { FinancialController } from 'src/financial/financial.controller';
import { FinancialService } from 'src/financial/financial.service';
import { StockOutValueService } from 'src/financial/services/stock-out-value.service';
import { ServiceOrdersModule } from 'src/service-orders/service-orders.module';

@Module({
  imports: [ClientsModule, ServiceOrdersModule],
  controllers: [FinancialController],
  providers: [FinancialService, StockOutValueService],
  exports: [FinancialService, StockOutValueService],
})
export class FinancialModule {}
