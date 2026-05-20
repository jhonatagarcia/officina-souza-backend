import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule, Logger } from 'nestjs-pino';
import { AuthModule } from 'src/auth/auth.module';
import { BudgetConversionsModule } from 'src/budget-conversions/budget-conversions.module';
import { BudgetsModule } from 'src/budgets/budgets.module';
import { ClientsModule } from 'src/clients/clients.module';
import appConfig from 'src/config/app.config';
import { getEnvFilePath } from 'src/config/env-file-path';
import { validateEnv } from 'src/config/env.validation';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { DashboardModule } from 'src/dashboard/dashboard.module';
import { FinancialModule } from 'src/financial/financial.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { QueueModule } from 'src/queue/queue.module';
import { ServiceCatalogModule } from 'src/service-catalog/service-catalog.module';
import { ServiceOrdersModule } from 'src/service-orders/service-orders.module';
import { UsersModule } from 'src/users/users.module';
import { VehiclesModule } from 'src/vehicles/vehicles.module';
import { HealthModule } from 'src/health/health.module';
import { WorkshopsModule } from 'src/workshops/workshops.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnv,
      envFilePath: getEnvFilePath(),
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.getOrThrow<string>('logging.level'),
          redact: {
            paths: [
              'req.headers.authorization',
              'req.body.password',
              'req.body.passwordConfirmation',
              'req.body.token',
              'req.body.credential',
              'req.body.captchaToken',
              'res.headers["set-cookie"]',
            ],
            censor: '[REDACTED]',
          },
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.getOrThrow<number>('throttle.ttl') * 1000,
          limit: configService.getOrThrow<number>('throttle.limit'),
        },
      ],
    }),
    QueueModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    ClientsModule,
    VehiclesModule,
    BudgetsModule,
    BudgetConversionsModule,
    ServiceCatalogModule,
    ServiceOrdersModule,
    InventoryModule,
    NotificationsModule,
    FinancialModule,
    DashboardModule,
    WorkshopsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      inject: [Logger],
      useFactory: (logger: Logger) => new HttpExceptionFilter(logger),
    },
  ],
})
export class AppModule {}
