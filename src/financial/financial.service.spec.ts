import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FinancialStatus } from '@prisma/client';
import { ClientsService } from 'src/clients/clients.service';
import { FinancialService } from 'src/financial/financial.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ServiceOrdersService } from 'src/service-orders/service-orders.service';

describe('FinancialService', () => {
  let service: FinancialService;

  const prismaMock = {
    financialEntry: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const clientsServiceMock = { ensureExists: jest.fn() };
  const serviceOrdersServiceMock = { ensureExists: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        FinancialService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ClientsService, useValue: clientsServiceMock },
        { provide: ServiceOrdersService, useValue: serviceOrdersServiceMock },
      ],
    }).compile();

    service = moduleRef.get(FinancialService);
  });

  it('should create overdue entry with VENCIDO status automatically', async () => {
    prismaMock.financialEntry.create.mockResolvedValue({ id: 'fin-1', status: FinancialStatus.VENCIDO });

    await service.create({
      type: 'RECEIVABLE',
      description: 'Parcela atrasada',
      category: 'Servico',
      amount: 150,
      dueDate: '2020-01-01T00:00:00.000Z',
    });

    expect(prismaMock.financialEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: FinancialStatus.VENCIDO,
          dueDate: new Date('2020-01-01T00:00:00.000Z'),
        }),
      }),
    );
  });

  it('should keep explicit status when provided on creation', async () => {
    prismaMock.financialEntry.create.mockResolvedValue({ id: 'fin-1', status: FinancialStatus.PENDENTE });

    await service.create({
      type: 'RECEIVABLE',
      description: 'Cobrança',
      category: 'Servico',
      amount: 150,
      dueDate: '2020-01-01T00:00:00.000Z',
      status: 'PENDENTE',
    });

    expect(prismaMock.financialEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: FinancialStatus.PENDENTE,
        }),
      }),
    );
  });

  it('should block mismatched client and service order references', async () => {
    clientsServiceMock.ensureExists.mockResolvedValue({ id: 'client-1' });
    serviceOrdersServiceMock.ensureExists.mockResolvedValue({ id: 'os-1', clientId: 'client-2' });

    await expect(
      service.create({
        type: 'RECEIVABLE',
        description: 'Cobrança',
        category: 'Servico',
        amount: 150,
        dueDate: '2030-01-01T00:00:00.000Z',
        clientId: 'client-1',
        serviceOrderId: 'os-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should block update of paid financial entry', async () => {
    prismaMock.financialEntry.findUnique.mockResolvedValue({
      id: 'fin-1',
      status: FinancialStatus.PAGO,
      client: null,
      serviceOrder: null,
    });

    await expect(service.update('fin-1', { notes: 'x' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should update due date converting it to Date', async () => {
    prismaMock.financialEntry.findUnique.mockResolvedValue({
      id: 'fin-1',
      status: FinancialStatus.PENDENTE,
      clientId: null,
      serviceOrderId: null,
      client: null,
      serviceOrder: null,
    });
    prismaMock.financialEntry.update.mockResolvedValue({ id: 'fin-1' });

    await service.update('fin-1', { dueDate: '2030-01-01T00:00:00.000Z' });

    expect(prismaMock.financialEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'fin-1' },
        data: expect.objectContaining({
          dueDate: new Date('2030-01-01T00:00:00.000Z'),
        }),
      }),
    );
  });

  it('should pay pending entry with payment metadata', async () => {
    prismaMock.financialEntry.findUnique.mockResolvedValue({
      id: 'fin-1',
      status: FinancialStatus.PENDENTE,
      client: null,
      serviceOrder: null,
    });
    prismaMock.financialEntry.update.mockResolvedValue({
      id: 'fin-1',
      status: FinancialStatus.PAGO,
    });

    await service.pay('fin-1', {
      paymentMethod: 'PIX',
      paidAt: '2030-01-01T00:00:00.000Z',
    });

    expect(prismaMock.financialEntry.update).toHaveBeenCalledWith({
      where: { id: 'fin-1' },
      data: {
        status: FinancialStatus.PAGO,
        paymentMethod: 'PIX',
        paidAt: new Date('2030-01-01T00:00:00.000Z'),
      },
      include: { client: true, serviceOrder: true },
    });
  });

  it('should block paying an already paid entry', async () => {
    prismaMock.financialEntry.findUnique.mockResolvedValue({
      id: 'fin-1',
      status: FinancialStatus.PAGO,
      client: null,
      serviceOrder: null,
    });

    await expect(
      service.pay('fin-1', {
        paymentMethod: 'PIX',
        paidAt: '2030-01-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
