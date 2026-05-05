import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FinancialStatus, Prisma } from '@prisma/client';
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
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    serviceOrderPart: {
      aggregate: jest.fn(),
    },
    serviceOrder: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const clientsServiceMock = { ensureExists: jest.fn() };
  const serviceOrdersServiceMock = { ensureExists: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockResolvedValue([[], 0]);

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
      dueDate: new Date('2020-01-01T00:00:00.000Z'),
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
          status: FinancialStatus.PENDENTE,
        }),
      }),
    );
  });

  it('should apply financial filters when listing entries', async () => {
    prismaMock.$transaction.mockResolvedValueOnce([[{ id: 'fin-1' }], 1]);

    await service.findAll({
      page: 1,
      limit: 10,
      search: 'OS',
      status: 'PENDENTE',
      type: 'RECEIVABLE',
      sortOrder: 'desc',
    });

    expect(prismaMock.financialEntry.updateMany).toHaveBeenCalled();
    expect(prismaMock.financialEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { description: { contains: 'OS', mode: 'insensitive' } },
            { category: { contains: 'OS', mode: 'insensitive' } },
          ],
          status: 'PENDENTE',
          type: 'RECEIVABLE',
        },
      }),
    );
    expect(prismaMock.financialEntry.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { description: { contains: 'OS', mode: 'insensitive' } },
          { category: { contains: 'OS', mode: 'insensitive' } },
        ],
        status: 'PENDENTE',
        type: 'RECEIVABLE',
      },
    });
  });

  it('should summarize receivables and stock output from service order parts', async () => {
    prismaMock.financialEntry.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal(450) },
    });
    prismaMock.serviceOrderPart.aggregate
      .mockResolvedValueOnce({ _sum: { totalPrice: new Prisma.Decimal(100) } });
    prismaMock.serviceOrder.findMany.mockResolvedValue([
      {
        parts: [
          {
            quantity: 2,
            inventoryItem: {
              cost: new Prisma.Decimal(40),
            },
          },
          {
            quantity: 1,
            inventoryItem: {
              cost: new Prisma.Decimal(20),
            },
          },
        ],
        budget: null,
      },
      {
        parts: [],
        budget: {
          items: [
            {
              quantity: 1,
              inventoryItem: {
                cost: new Prisma.Decimal(35),
              },
            },
          ],
        },
      },
    ]);

    const result = await service.getSummary();

    expect(result).toEqual({
      receivablesValue: new Prisma.Decimal(550),
      stockOutValue: new Prisma.Decimal(135),
    });
    expect(prismaMock.financialEntry.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'RECEIVABLE',
          dueDate: {
            gte: expect.any(Date),
            lt: expect.any(Date),
          },
        }),
      }),
    );
    expect(prismaMock.serviceOrder.findMany).toHaveBeenCalledWith({
      where: {
        financialEntries: {
          some: {
            type: 'RECEIVABLE',
            status: 'PAGO',
          },
        },
      },
      include: {
        parts: {
          select: {
            quantity: true,
            inventoryItem: {
              select: {
                cost: true,
              },
            },
          },
        },
        budget: {
          include: {
            items: {
              where: {
                inventoryItemId: {
                  not: null,
                },
              },
              select: {
                quantity: true,
                inventoryItem: {
                  select: {
                    cost: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    expect(prismaMock.serviceOrderPart.aggregate).toHaveBeenCalledWith({
      _sum: { totalPrice: true },
      where: {
        updatedAt: {
          gte: expect.any(Date),
          lt: expect.any(Date),
        },
        serviceOrder: {
          financialEntries: {
            none: {
              type: 'RECEIVABLE',
            },
          },
        },
      },
    });
  });

  it('should recalculate status from due date on update when status is not explicit', async () => {
    prismaMock.financialEntry.findUnique.mockResolvedValue({
      id: 'fin-1',
      status: FinancialStatus.VENCIDO,
      dueDate: new Date('2020-01-01T00:00:00.000Z'),
      clientId: null,
      serviceOrderId: null,
      client: null,
      serviceOrder: null,
    });
    prismaMock.financialEntry.update.mockResolvedValue({ id: 'fin-1' });

    await service.update('fin-1', { dueDate: '2030-01-01T00:00:00.000Z' });

    expect(prismaMock.financialEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dueDate: new Date('2030-01-01T00:00:00.000Z'),
          status: FinancialStatus.PENDENTE,
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
