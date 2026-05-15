import 'reflect-metadata';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import appConfig from 'src/config/app.config';
import { getEnvFilePath } from 'src/config/env-file-path';
import { validateEnv } from 'src/config/env.validation';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { Role } from 'src/common/enums/role.enum';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnv,
      envFilePath: getEnvFilePath(),
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
  const prisma = app.get(PrismaService);

  const adminEmail = configService.get<string>('seed.adminEmail');
  const adminPassword = configService.get<string>('seed.adminPassword');
  const adminName = configService.get<string>('seed.adminName');

  if (adminEmail && adminPassword && adminName) {
    const existing = await usersService.findByEmail(adminEmail);

    if (!existing) {
      const workshop = await prisma.workshop.upsert({
        where: { id: '00000000-0000-4000-8000-000000000001' },
        update: { tradeName: 'Oficina Principal' },
        create: {
          id: '00000000-0000-4000-8000-000000000001',
          tradeName: 'Oficina Principal',
        },
      });

      await usersService.create(
        {
          sub: 'seed',
          email: adminEmail,
          role: Role.ADMIN,
          workshopId: workshop.id,
        },
        {
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          role: Role.ADMIN,
        },
      );
    }
  }

  await app.close();
}

void bootstrap();
