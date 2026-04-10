import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);
  const logger = app.get(Logger);

  app.useLogger(logger);
  app.setGlobalPrefix(configService.getOrThrow<string>('app.apiPrefix'));
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.use(helmet());
  app.enableCors({
    origin: configService.getOrThrow<string[]>('cors.origin'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(configService.getOrThrow<string>('app.name'))
    .setDescription('API do sistema de gestão para oficina mecânica')
    .setVersion(configService.getOrThrow<string>('app.version'))
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  await app.listen(configService.getOrThrow<number>('app.port'));
}

void bootstrap();
