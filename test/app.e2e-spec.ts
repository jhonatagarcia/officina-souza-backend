/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { ExecutionContext, INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthService } from 'src/auth/auth.service';
import { BudgetConversionsService } from 'src/budget-conversions/budget-conversions.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { BudgetsService } from 'src/budgets/budgets.service';
import { ClientsService } from 'src/clients/clients.service';
import { DashboardService } from 'src/dashboard/dashboard.service';
import { FinancialService } from 'src/financial/financial.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ServiceOrdersService } from 'src/service-orders/service-orders.service';
import { VehiclesService } from 'src/vehicles/vehicles.service';

const clientId = '11111111-1111-4111-8111-111111111111';
const vehicleId = '22222222-2222-4222-8222-222222222222';
const budgetId = '33333333-3333-4333-8333-333333333333';
const serviceOrderId = '44444444-4444-4444-8444-444444444444';
const financialEntryId = '55555555-5555-4555-8555-555555555555';

process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.APP_NAME = 'Test API';
process.env.APP_VERSION = '1.0.0';
process.env.API_PREFIX = 'api';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'secret';
process.env.JWT_EXPIRES_IN = '1d';
process.env.JWT_ISSUER = 'test-api';
process.env.JWT_AUDIENCE = 'test-client';
process.env.BCRYPT_SALT_ROUNDS = '10';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.CORS_CREDENTIALS = 'false';
process.env.THROTTLE_TTL = '60';
process.env.THROTTLE_LIMIT = '100';
process.env.LOG_LEVEL = 'silent';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const { AppModule } = await import('src/app.module');
    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              nodeEnv: 'test',
              app: {
                name: 'Test API',
                version: '1.0.0',
                port: 3000,
                apiPrefix: 'api',
              },
              database: { url: 'postgresql://test' },
              auth: {
                jwtSecret: 'secret',
                jwtExpiresIn: '1d',
                jwtIssuer: 'test-api',
                jwtAudience: 'test-client',
                bcryptSaltRounds: 10,
              },
              cors: { origin: ['http://localhost:3000'], credentials: false },
              throttle: { ttl: 60, limit: 100 },
              logging: { level: 'silent' },
            }),
          ],
        }),
        AppModule,
      ],
    })
      .overrideProvider(AuthService)
      .useValue({
        login: jest.fn().mockResolvedValue({
          accessToken: 'token',
          user: {
            id: 'user-1',
            name: 'Admin',
            email: 'admin@local.com',
            role: 'ADMIN',
          },
        }),
        me: jest.fn().mockResolvedValue({
          id: 'user-1',
          name: 'Admin',
          email: 'admin@local.com',
          role: 'ADMIN',
        }),
      })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { sub: 'user-1', email: 'admin@local.com', role: 'ADMIN' };
          return true;
        },
      })
      .overrideProvider(ClientsService)
      .useValue({
        create: jest.fn().mockResolvedValue({ id: clientId, name: 'João' }),
        findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
        findOne: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        ensureExists: jest.fn().mockResolvedValue({ id: clientId, isActive: true }),
      })
      .overrideProvider(VehiclesService)
      .useValue({
        create: jest.fn().mockResolvedValue({ id: vehicleId, plate: 'ABC1234' }),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        getHistory: jest.fn(),
        ensureExists: jest.fn().mockResolvedValue({ id: vehicleId, clientId }),
      })
      .overrideProvider(BudgetsService)
      .useValue({
        create: jest.fn().mockResolvedValue({ id: budgetId, code: 'BUD-1' }),
        findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
        findOne: jest.fn(),
        update: jest.fn(),
        approve: jest.fn(),
        reject: jest.fn(),
        assertCanConvert: jest.fn(),
        markConverted: jest.fn(),
      })
      .overrideProvider(BudgetConversionsService)
      .useValue({
        convertToServiceOrder: jest.fn().mockResolvedValue({
          id: budgetId,
          convertedToServiceOrder: true,
          serviceOrder: { id: serviceOrderId, orderNumber: 'OS-1', status: 'ABERTA' },
        }),
      })
      .overrideProvider(ServiceOrdersService)
      .useValue({
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        updateStatus: jest.fn(),
        addPart: jest.fn().mockResolvedValue({ id: 'part-1' }),
        listParts: jest.fn(),
        ensureExists: jest.fn().mockResolvedValue({ id: serviceOrderId }),
      })
      .overrideProvider(FinancialService)
      .useValue({
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        pay: jest.fn().mockResolvedValue({ id: financialEntryId, status: 'PAGO' }),
      })
      .overrideProvider(DashboardService)
      .useValue({
        getSummary: jest.fn().mockResolvedValue({
          serviceOrders: { open: 0, inProgress: 0, readyForDelivery: 0 },
          budgets: { pending: 0 },
          financial: { monthRevenue: 0 },
          inventory: { lowStockCount: 0, lowStockItems: [] },
        }),
      })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        enableShutdownHooks: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/api/v1/auth/login (POST)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@local.com', password: 'Secret123!' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.accessToken).toBe('token');
      });
  });

  it('/api/v1/auth/login (POST) should validate payload', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'invalid-email', password: '123' })
      .expect(400);
  });

  it('/api/v1/auth/me (GET)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer token')
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('admin@local.com');
      });
  });

  it('/api/v1/clients (POST)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', 'Bearer token')
      .send({ name: 'João', phone: '11999999999' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.id).toBe(clientId);
      });
  });

  it('/api/v1/clients (POST) should validate invalid email', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', 'Bearer token')
      .send({ name: 'João', email: 'not-an-email' })
      .expect(400);
  });

  it('/api/v1/vehicles (POST)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', 'Bearer token')
      .send({
        clientId,
        plate: 'ABC1234',
        brand: 'Honda',
        model: 'Civic',
        year: 2020,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.id).toBe(vehicleId);
      });
  });

  it('/api/v1/vehicles (POST) should validate vehicle year', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', 'Bearer token')
      .send({
        clientId,
        plate: 'ABC1234',
        brand: 'Honda',
        model: 'Civic',
        year: 1800,
      })
      .expect(400);
  });

  it('/api/v1/budgets (POST)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/budgets')
      .set('Authorization', 'Bearer token')
      .send({
        clientId,
        vehicleId,
        problemDescription: 'Ruído',
        discount: 0,
        items: [
          {
            type: 'LABOR',
            description: 'Diagnóstico',
            quantity: 1,
            unitPrice: 100,
          },
        ],
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.id).toBe(budgetId);
      });
  });

  it('/api/v1/budgets (POST) should validate empty items array', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/budgets')
      .set('Authorization', 'Bearer token')
      .send({
        clientId,
        vehicleId,
        problemDescription: 'Ruído',
        discount: 0,
        items: [],
      })
      .expect(400);
  });

  it('/api/v1/budgets/:id/convert-to-service-order (POST)', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/budgets/${budgetId}/convert-to-service-order`)
      .set('Authorization', 'Bearer token')
      .expect(201)
      .expect(({ body }) => {
        expect(body.id).toBe(budgetId);
        expect(body.serviceOrder.id).toBe(serviceOrderId);
      });
  });

  it('/api/v1/dashboard/summary (GET)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .set('Authorization', 'Bearer token')
      .expect(200)
      .expect(({ body }) => {
        expect(body.serviceOrders.open).toBe(0);
        expect(body.inventory.lowStockItems).toEqual([]);
      });
  });

  it('/api/v1/financial (POST)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/financial')
      .set('Authorization', 'Bearer token')
      .send({
        type: 'RECEIVABLE',
        description: 'Cobrança OS',
        category: 'Servico',
        amount: 100,
        dueDate: new Date().toISOString(),
      })
      .expect(201);
  });

  it('/api/v1/financial/:id/pay (PATCH)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/financial/${financialEntryId}/pay`)
      .set('Authorization', 'Bearer token')
      .send({ paymentMethod: 'PIX', paidAt: new Date().toISOString() })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('PAGO');
      });
  });

  it('/api/v1/financial/:id/pay (PATCH) should validate payment payload', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/financial/${financialEntryId}/pay`)
      .set('Authorization', 'Bearer token')
      .send({ paymentMethod: 'INVALIDO', paidAt: 'not-a-date' })
      .expect(400);
  });

  it('/api/v1/health (GET)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
      });
  });
});
