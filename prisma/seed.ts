import 'reflect-metadata';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import appConfig from 'src/config/app.config';
import { validateEnv } from 'src/config/env.validation';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { Role } from 'src/common/enums/role.enum';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnv,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    UsersModule,
  ],
})
class SeedModule {}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SeedModule);
  const configService = app.get(ConfigService);
  const usersService = app.get(UsersService);

  const adminEmail = configService.get<string>('seed.adminEmail');
  const adminPassword = configService.get<string>('seed.adminPassword');
  const adminName = configService.get<string>('seed.adminName');

  if (adminEmail && adminPassword && adminName) {
    const existing = await usersService.findByEmail(adminEmail);

    if (!existing) {
      await usersService.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: Role.ADMIN,
      });
    }
  }

  await app.close();
}

void bootstrap();
