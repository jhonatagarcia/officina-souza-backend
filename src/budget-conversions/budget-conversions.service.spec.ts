import { Test } from '@nestjs/testing';
import { BudgetsService } from 'src/budgets/budgets.service';
import { BudgetConversionsService } from 'src/budget-conversions/budget-conversions.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('BudgetConversionsService', () => {
  let service: BudgetConversionsService;

  const prismaMock = {
    serviceOrder: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const budgetsServiceMock = {
    assertCanConvert: jest.fn(),
    markConverted: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        BudgetConversionsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: BudgetsService, useValue: budgetsServiceMock },
      ],
    }).compile();

    service = moduleRef.get(BudgetConversionsService);
  });

  it('should convert approved budget into service order and mark it converted', async () => {
    budgetsServiceMock.assertCanConvert.mockResolvedValue({
      id: 'budget-1',
      clientId: 'client-1',
      vehicleId: 'vehicle-1',
      problemDescription: 'Falha no freio',
      notes: 'urgente',
    });
    prismaMock.serviceOrder.findMany.mockResolvedValue([]);
    prismaMock.serviceOrder.create.mockResolvedValue({
      id: 'os-1',
      orderNumber: 'OS-1',
      status: 'ABERTA',
      budgetId: 'budget-1',
      clientId: 'client-1',
      vehicleId: 'vehicle-1',
    });
    budgetsServiceMock.markConverted.mockResolvedValue({
      id: 'budget-1',
      convertedToServiceOrder: true,
    });

    const result = await service.convertToServiceOrder('budget-1');

    expect(result).toEqual({
      id: 'budget-1',
      convertedToServiceOrder: true,
      serviceOrder: {
        id: 'os-1',
        orderNumber: 'OS-1',
        status: 'ABERTA',
      },
    });
    expect(prismaMock.serviceOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          budgetId: 'budget-1',
          clientId: 'client-1',
          vehicleId: 'vehicle-1',
          problemDescription: 'Falha no freio',
        }) as {
          budgetId: string;
          clientId: string;
          vehicleId: string;
          problemDescription: string;
        },
      }),
    );
    expect(budgetsServiceMock.markConverted).toHaveBeenCalledWith('budget-1', prismaMock as never);
  });
});
