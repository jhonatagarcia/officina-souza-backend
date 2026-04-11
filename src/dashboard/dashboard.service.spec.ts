import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { DashboardService } from 'src/dashboard/dashboard.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const prismaMock = {
    serviceOrder: {
      count: jest.fn(),
    },
    budget: {
      count: jest.fn(),
    },
    inventoryItem: {
      findMany: jest.fn(),
    },
    financialEntry: {
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = moduleRef.get(DashboardService);
  });

  it('should return dashboard summary using the requested business rules', async () => {
    prismaMock.serviceOrder.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    prismaMock.budget.count.mockResolvedValue(4);
    prismaMock.inventoryItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        name: 'Filtro',
        quantity: 1,
        minimumQuantity: 2,
        internalCode: 'PEC-000001',
      },
      {
        id: 'item-2',
        name: 'Pastilha',
        quantity: 5,
        minimumQuantity: 2,
        internalCode: 'PEC-000002',
      },
      {
        id: 'item-3',
        name: 'Oleo',
        quantity: 2,
        minimumQuantity: 2,
        internalCode: 'PEC-000003',
      },
    ]);
    prismaMock.financialEntry.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal(350) },
    });

    const result = await service.getSummary();

    expect(result).toEqual({
      serviceOrders: {
        open: 2,
        inProgress: 3,
        readyForDelivery: 1,
      },
      budgets: {
        pending: 4,
      },
      financial: {
        monthRevenue: new Prisma.Decimal(350),
      },
      inventory: {
        lowStockCount: 2,
        lowStockItems: [
          {
            id: 'item-1',
            name: 'Filtro',
            quantity: 1,
            minimumQuantity: 2,
            internalCode: 'PEC-000001',
          },
          {
            id: 'item-3',
            name: 'Oleo',
            quantity: 2,
            minimumQuantity: 2,
            internalCode: 'PEC-000003',
          },
        ],
      },
    });
  });
});
