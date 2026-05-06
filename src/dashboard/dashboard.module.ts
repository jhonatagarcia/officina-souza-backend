import { Module } from '@nestjs/common';
import { DashboardController } from 'src/dashboard/dashboard.controller';
import { DashboardService } from 'src/dashboard/dashboard.service';
import { StockOutValueService } from 'src/financial/services/stock-out-value.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, StockOutValueService],
})
export class DashboardModule {}
