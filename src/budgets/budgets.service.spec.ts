import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BudgetStatus } from '@prisma/client';
import { BudgetReaderService } from 'src/budgets/services/budget-reader.service';
import { BudgetReferenceValidatorService } from 'src/budgets/services/budget-reference-validator.service';
import { BudgetTotalsService } from 'src/budgets/services/budget-totals.service';
import { BudgetsService } from 'src/budgets/budgets.service';
import { ApproveBudgetUseCase } from 'src/budgets/use-cases/approve-budget.use-case';
import { CreateBudgetUseCase } from 'src/budgets/use-cases/create-budget.use-case';
import { RejectBudgetUseCase } from 'src/budgets/use-cases/reject-budget.use-case';
import { UpdateBudgetUseCase } from 'src/budgets/use-cases/update-budget.use-case';
import { ClientsService } from 'src/clients/clients.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { VehiclesService } from 'src/vehicles/vehicles.service';

describe('BudgetsService', () => {
  let service: BudgetsService;
  const prismaMock = {
    budget: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    budgetItem: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const clientsServiceMock = {
    ensureExists: jest.fn(),
  };
  const vehiclesServiceMock = {
    ensureExists: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) =>
      callback(prismaMock),
    );
    const moduleRef = await Test.createTestingModule({
      providers: [
        BudgetsService,
        BudgetReaderService,
        BudgetReferenceValidatorService,
        BudgetTotalsService,
        CreateBudgetUseCase,
        UpdateBudgetUseCase,
        ApproveBudgetUseCase,
        RejectBudgetUseCase,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ClientsService, useValue: clientsServiceMock },
        { provide: VehiclesService, useValue: vehiclesServiceMock },
      ],
    }).compile();

    service = moduleRef.get(BudgetsService);
  });

  it('should create budget with computed totals', async () => {
    prismaMock.budget.create.mockResolvedValue({ id: 'budget-1' });
    clientsServiceMock.ensureExists.mockResolvedValue({ id: 'client-1' });
    vehiclesServiceMock.ensureExists.mockResolvedValue({ id: 'vehicle-1', clientId: 'client-1' });

    await service.create({
      clientId: 'client-1',
      vehicleId: 'vehicle-1',
      problemDescription: 'Motor falhando',
      discount: 10,
      items: [
        {
          type: 'LABOR',
          description: 'Diagnóstico',
          quantity: 1,
          unitPrice: 100,
        },
      ],
    });

    const createCall = prismaMock.budget.create.mock.calls[0] as [
      { data: { subtotal: number; total: number; items: { create: Array<{ totalPrice: number }> } } },
    ];

    expect(createCall[0].data.subtotal).toBe(100);
    expect(createCall[0].data.total).toBe(90);
    expect(createCall[0].data.items.create[0]!.totalPrice).toBe(100);
  });

  it('should block discount greater than subtotal', async () => {
    clientsServiceMock.ensureExists.mockResolvedValue({ id: 'client-1' });
    vehiclesServiceMock.ensureExists.mockResolvedValue({ id: 'vehicle-1', clientId: 'client-1' });

    await expect(
      service.create({
        clientId: 'client-1',
        vehicleId: 'vehicle-1',
        problemDescription: 'Motor falhando',
        discount: 200,
        items: [
          {
            type: 'LABOR',
            description: 'Diagnóstico',
            quantity: 1,
            unitPrice: 100,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should block conversion of non-approved budget', async () => {
    const tx = {
      budget: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'budget-1',
          status: BudgetStatus.PENDENTE,
          convertedToServiceOrder: false,
          serviceOrder: null,
          items: [],
        }),
      },
    };

    await expect(service.assertCanConvert('budget-1', tx as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should block duplicate conversion', async () => {
    const tx = {
      budget: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'budget-1',
          status: BudgetStatus.APROVADO,
          convertedToServiceOrder: true,
          serviceOrder: null,
          items: [],
        }),
      },
    };

    await expect(service.assertCanConvert('budget-1', tx as never)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('should block budget creation when vehicle does not belong to client', async () => {
    clientsServiceMock.ensureExists.mockResolvedValue({ id: 'client-1' });
    vehiclesServiceMock.ensureExists.mockResolvedValue({ id: 'vehicle-1', clientId: 'client-2' });

    await expect(
      service.create({
        clientId: 'client-1',
        vehicleId: 'vehicle-1',
        problemDescription: 'Motor falhando',
        discount: 0,
        items: [
          {
            type: 'LABOR',
            description: 'Diagnóstico',
            quantity: 1,
            unitPrice: 100,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should update pending budget replacing items and recalculating totals', async () => {
    prismaMock.budget.findUnique.mockResolvedValue({
      id: 'budget-1',
      status: BudgetStatus.PENDENTE,
      clientId: 'client-1',
      vehicleId: 'vehicle-1',
      discount: 10,
      serviceOrder: null,
    });
    prismaMock.budget.update.mockResolvedValue({ id: 'budget-1' });
    clientsServiceMock.ensureExists.mockResolvedValue({ id: 'client-1' });
    vehiclesServiceMock.ensureExists.mockResolvedValue({ id: 'vehicle-1', clientId: 'client-1' });

    await service.update('budget-1', {
      discount: 20,
      items: [
        {
          type: 'PART',
          description: 'Pastilha',
          quantity: 2,
          unitPrice: 50,
        },
      ],
    });

    expect(prismaMock.budgetItem.deleteMany).toHaveBeenCalledWith({ where: { budgetId: 'budget-1' } });
    expect(prismaMock.budget.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'budget-1' },
        data: expect.objectContaining({
          subtotal: 100,
          total: 80,
          items: {
            create: [
              expect.objectContaining({
                totalPrice: 100,
              }),
            ],
          },
        }),
      }),
    );
  });

  it('should block update when budget is not pending', async () => {
    prismaMock.budget.findUnique.mockResolvedValue({
      id: 'budget-1',
      status: BudgetStatus.APROVADO,
      serviceOrder: null,
    });

    await expect(service.update('budget-1', { notes: 'novo' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should approve pending budget with approval timestamp', async () => {
    prismaMock.budget.findUnique.mockResolvedValue({
      id: 'budget-1',
      status: BudgetStatus.PENDENTE,
      serviceOrder: null,
    });
    prismaMock.budget.update.mockResolvedValue({ id: 'budget-1', status: BudgetStatus.APROVADO });

    await service.approve('budget-1');

    expect(prismaMock.budget.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'budget-1' },
        data: expect.objectContaining({
          status: BudgetStatus.APROVADO,
          approvedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('should mark budget as converted inside transaction', async () => {
    prismaMock.budget.update.mockResolvedValue({ id: 'budget-1', convertedToServiceOrder: true });

    await service.markConverted('budget-1', prismaMock as never);

    expect(prismaMock.budget.update).toHaveBeenCalledWith({
      where: { id: 'budget-1' },
      data: { convertedToServiceOrder: true },
    });
  });
});
