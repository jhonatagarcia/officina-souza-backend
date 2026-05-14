import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ConnectionOptions } from 'bullmq';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const username = configService.get<string>('queue.redis.username')?.trim();
        const password = configService.get<string>('queue.redis.password')?.trim();
        const useTls = configService.get<boolean>('queue.redis.tls') ?? false;

        const connection: ConnectionOptions = {
          host: configService.getOrThrow<string>('queue.redis.host'),
          port: configService.getOrThrow<number>('queue.redis.port'),
          db: configService.getOrThrow<number>('queue.redis.db'),
          ...(username ? { username } : {}),
          ...(password ? { password } : {}),
          ...(useTls ? { tls: {} } : {}),
        };

        return {
          prefix: configService.getOrThrow<string>('queue.prefix'),
          connection,
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
