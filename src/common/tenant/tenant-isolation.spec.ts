import { NotFoundException } from '@nestjs/common';
import { FinancialStatus } from '@prisma/client';
import { BudgetsService } from 'src/budgets/budgets.service';
import { ClientsService } from 'src/clients/clients.service';
import type { RequestUser } from 'src/common/types/request-user.type';
import { FinancialService } from 'src/financial/financial.service';
import { InventoryService } from 'src/inventory/inventory.service';
import { ServiceOrdersService } from 'src/service-orders/service-orders.service';
import { VehiclesService } from 'src/vehicles/vehicles.service';

const tenantA: RequestUser = {
  sub: 'user-a',
  email: 'admin-a@local.com',
  role: 'ADMIN',
  workshopId: 'workshop-a',
};

describe('Tenant isolation', () => {
  it('scopes client reads, updates and deletes by authenticated workshop', async () => {
    const prisma = {
      client: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    const service = new ClientsService(prisma as never);

    await expect(service.findOne(tenantA, 'client-b')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(tenantA, 'client-b', { name: 'X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.remove(tenantA, 'client-b')).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.client.findUnique).toHaveBeenCalledWith({
      where: { id_workshopId: { id: 'client-b', workshopId: 'workshop-a' } },
      include: { vehicles: true },
    });
    expect(prisma.client.update).not.toHaveBeenCalled();
  });

  it('scopes vehicle reads and history by authenticated workshop', async () => {
    const prisma = {
      vehicle: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      vehicleHistory: {
        findMany: jest.fn(),
      },
    };
    const service = new VehiclesService(prisma as never, {} as never);

    await expect(service.findOne(tenantA, 'vehicle-b')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getHistory(tenantA, 'vehicle-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.vehicle.findUnique).toHaveBeenCalledWith({
      where: { id_workshopId: { id: 'vehicle-b', workshopId: 'workshop-a' } },
      include: { client: true },
    });
    expect(prisma.vehicleHistory.findMany).not.toHaveBeenCalled();
  });

  it('creates inventory movements only after finding the item in the same workshop', async () => {
    const prisma = {
      inventoryItem: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const service = new InventoryService(prisma as never);

    await expect(service.update(tenantA, 'item-b', { quantity: 10 })).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.inventoryItem.findUnique).toHaveBeenCalledWith({
      where: { id_workshopId: { id: 'item-b', workshopId: 'workshop-a' } },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('scopes budgets and service orders by workshop before exposing details', async () => {
    const budgetPrisma = {
      budget: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const budgetsService = new BudgetsService(
      budgetPrisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(budgetsService.findOne(tenantA, 'budget-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(budgetPrisma.budget.findUnique).toHaveBeenCalledWith({
      where: { id_workshopId: { id: 'budget-b', workshopId: 'workshop-a' } },
      include: { client: true, vehicle: true, items: true, serviceOrder: true },
    });

    const serviceOrderPrisma = {
      serviceOrder: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const serviceOrdersService = new ServiceOrdersService(
      serviceOrderPrisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(serviceOrdersService.findOne(tenantA, 'os-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(serviceOrderPrisma.serviceOrder.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_workshopId: { id: 'os-b', workshopId: 'workshop-a' } },
      }),
    );
  });

  it('scopes financial read/update/pay and blocks cross-tenant mutation', async () => {
    const prisma = {
      financialEntry: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    const service = new FinancialService(prisma as never, {} as never, {} as never, {} as never);

    await expect(service.findOne(tenantA, 'fin-b')).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.update(tenantA, 'fin-b', { status: FinancialStatus.PENDENTE }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.pay(tenantA, 'fin-b', {
        paymentMethod: 'PIX',
        paidAt: '2030-01-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.financialEntry.findUnique).toHaveBeenCalledWith({
      where: { id_workshopId: { id: 'fin-b', workshopId: 'workshop-a' } },
      include: { client: true, serviceOrder: true },
    });
    expect(prisma.financialEntry.update).not.toHaveBeenCalled();
  });
});
