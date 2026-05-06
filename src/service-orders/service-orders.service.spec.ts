import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, ServiceOrderStatus } from '@prisma/client';
import { ClientsService } from 'src/clients/clients.service';
import { InventoryService } from 'src/inventory/inventory.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ServiceOrderReferenceValidatorService } from 'src/service-orders/services/service-order-reference-validator.service';
import { ServiceOrdersService } from 'src/service-orders/service-orders.service';
import { AddServiceOrderPartUseCase } from 'src/service-orders/use-cases/add-service-order-part.use-case';
import { CreateServiceOrderUseCase } from 'src/service-orders/use-cases/create-service-order.use-case';
import { UpdateServiceOrderStatusUseCase } from 'src/service-orders/use-cases/update-service-order-status.use-case';
import { UsersService } from 'src/users/users.service';
import { VehiclesService } from 'src/vehicles/vehicles.service';

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

describe('ServiceOrdersService', () => {
  let service: ServiceOrdersService;

  const prismaMock = {
    serviceOrder: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    financialEntry: {
      create: jest.fn(),
    },
    inventoryItem: {
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    inventoryMovement: {
      create: jest.fn(),
    },
    serviceOrderPart: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    vehicleHistory: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const clientsServiceMock = { ensureExists: jest.fn() };
  const vehiclesServiceMock = { ensureExists: jest.fn() };
  const inventoryServiceMock = { reserveOrConsumePart: jest.fn() };
  const usersServiceMock = { findById: jest.fn() };
  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock),
    );
    prismaMock.serviceOrder.findMany.mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        ServiceOrdersService,
        ServiceOrderReferenceValidatorService,
        CreateServiceOrderUseCase,
        AddServiceOrderPartUseCase,
        UpdateServiceOrderStatusUseCase,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ClientsService, useValue: clientsServiceMock },
        { provide: VehiclesService, useValue: vehiclesServiceMock },
        { provide: InventoryService, useValue: inventoryServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
      ],
    }).compile();

    service = moduleRef.get(ServiceOrdersService);
  });

  it('should block delivery before finalization', async () => {
    prismaMock.serviceOrder.findUnique.mockResolvedValue({
      id: 'os-1',
      status: ServiceOrderStatus.EM_ANDAMENTO,
    });

    await expect(
      service.updateStatus('os-1', { status: ServiceOrderStatus.ENTREGUE }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should finalize and create vehicle history when none exists', async () => {
    prismaMock.serviceOrder.findUnique
      .mockResolvedValueOnce({
        id: 'os-1',
        status: ServiceOrderStatus.EM_ANDAMENTO,
      })
      .mockResolvedValueOnce({
        id: 'os-1',
        vehicleId: 'vehicle-1',
        finishedAt: new Date(),
        problemDescription: 'Falha no freio',
        servicesPerformed: 'Troca de pastilhas',
        vehicle: { mileage: 12000 },
        parts: [],
        budget: { total: 120 },
      });
    prismaMock.serviceOrder.update.mockResolvedValue({
      id: 'os-1',
      vehicleId: 'vehicle-1',
      status: ServiceOrderStatus.FINALIZADA,
      finishedAt: new Date(),
    });
    prismaMock.vehicleHistory.findFirst.mockResolvedValue(null);
    prismaMock.vehicleHistory.create.mockResolvedValue({ id: 'history-1' });

    const result = await service.updateStatus('os-1', {
      status: ServiceOrderStatus.FINALIZADA,
    });

    expect(result.status).toBe(ServiceOrderStatus.FINALIZADA);
    expect(prismaMock.serviceOrder.update).toHaveBeenCalled();
    expect(prismaMock.vehicleHistory.create).toHaveBeenCalled();
  });

  it('should not call external WhatsApp API when status is unchanged', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
    prismaMock.serviceOrder.findUnique.mockResolvedValueOnce({
      id: 'os-1',
      status: ServiceOrderStatus.EM_ANDAMENTO,
    });
    prismaMock.serviceOrder.update.mockResolvedValue({
      id: 'os-1',
      status: ServiceOrderStatus.EM_ANDAMENTO,
    });

    await service.updateStatus('os-1', { status: ServiceOrderStatus.EM_ANDAMENTO });

    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockRestore();
  });

  it('should update existing vehicle history instead of creating duplicate entry', async () => {
    prismaMock.serviceOrder.findUnique
      .mockResolvedValueOnce({
        id: 'os-1',
        status: ServiceOrderStatus.EM_ANDAMENTO,
      })
      .mockResolvedValueOnce({
        id: 'os-1',
        vehicleId: 'vehicle-1',
        finishedAt: new Date(),
        problemDescription: 'Falha no freio',
        servicesPerformed: 'Troca de fluido',
        vehicle: { mileage: 12000 },
        parts: [],
        budget: { total: 120 },
      });
    prismaMock.serviceOrder.update.mockResolvedValue({
      id: 'os-1',
      status: ServiceOrderStatus.FINALIZADA,
      finishedAt: new Date(),
    });
    prismaMock.vehicleHistory.findFirst.mockResolvedValue({ id: 'history-1' });
    prismaMock.vehicleHistory.update.mockResolvedValue({ id: 'history-1' });

    await service.updateStatus('os-1', { status: ServiceOrderStatus.FINALIZADA });

    expect(prismaMock.vehicleHistory.update).toHaveBeenCalled();
    expect(prismaMock.vehicleHistory.create).not.toHaveBeenCalled();
  });

  it('should create receivable entry when service order is delivered with budget total', async () => {
    const deliveredAt = new Date('2030-01-01T12:00:00.000Z');

    prismaMock.serviceOrder.findUnique
      .mockResolvedValueOnce({
        id: 'os-1',
        status: ServiceOrderStatus.FINALIZADA,
      })
      .mockResolvedValueOnce({
        id: 'os-1',
        orderNumber: 'OS-123',
        clientId: 'client-1',
        deliveredAt,
        budget: { total: { lte: () => false } },
        financialEntries: [],
      });
    prismaMock.serviceOrder.update.mockResolvedValue({
      id: 'os-1',
      status: ServiceOrderStatus.ENTREGUE,
      deliveredAt,
    });
    prismaMock.financialEntry.create.mockResolvedValue({ id: 'fin-1' });

    const result = await service.updateStatus('os-1', {
      status: ServiceOrderStatus.ENTREGUE,
    });

    expect(result.status).toBe(ServiceOrderStatus.ENTREGUE);
    expect(prismaMock.financialEntry.create).toHaveBeenCalledWith({
      data: {
        type: 'RECEIVABLE',
        description: 'Cobranca da OS-123',
        category: 'Ordem de Servico',
        amount: expect.any(Object) as Prisma.Decimal,
        dueDate: deliveredAt,
        status: 'PENDENTE',
        clientId: 'client-1',
        serviceOrderId: 'os-1',
      },
    });
  });

  it('should not create duplicate receivable entry when service order already has one', async () => {
    prismaMock.serviceOrder.findUnique
      .mockResolvedValueOnce({
        id: 'os-1',
        status: ServiceOrderStatus.FINALIZADA,
      })
      .mockResolvedValueOnce({
        id: 'os-1',
        orderNumber: 'OS-123',
        clientId: 'client-1',
        deliveredAt: new Date('2030-01-01T12:00:00.000Z'),
        budget: { total: { lte: () => false } },
        financialEntries: [{ id: 'fin-1' }],
      });
    prismaMock.serviceOrder.update.mockResolvedValue({
      id: 'os-1',
      status: ServiceOrderStatus.ENTREGUE,
      deliveredAt: new Date('2030-01-01T12:00:00.000Z'),
    });

    await service.updateStatus('os-1', { status: ServiceOrderStatus.ENTREGUE });

    expect(prismaMock.financialEntry.create).not.toHaveBeenCalled();
  });

  it('should create receivable entry from service order parts when there is no linked budget', async () => {
    const deliveredAt = new Date('2030-01-01T12:00:00.000Z');

    prismaMock.serviceOrder.findUnique
      .mockResolvedValueOnce({
        id: 'os-1',
        status: ServiceOrderStatus.FINALIZADA,
      })
      .mockResolvedValueOnce({
        id: 'os-1',
        orderNumber: 'OS-123',
        clientId: 'client-1',
        deliveredAt,
        budget: null,
        parts: [{ totalPrice: new Prisma.Decimal(80) }, { totalPrice: new Prisma.Decimal(20) }],
        financialEntries: [],
      });
    prismaMock.serviceOrder.update.mockResolvedValue({
      id: 'os-1',
      status: ServiceOrderStatus.ENTREGUE,
      deliveredAt,
    });
    prismaMock.financialEntry.create.mockResolvedValue({ id: 'fin-1' });

    await service.updateStatus('os-1', {
      status: ServiceOrderStatus.ENTREGUE,
    });

    expect(prismaMock.financialEntry.create).toHaveBeenCalledWith({
      data: {
        type: 'RECEIVABLE',
        description: 'Cobranca da OS-123',
        category: 'Ordem de Servico',
        amount: expect.any(Prisma.Decimal) as Prisma.Decimal,
        dueDate: deliveredAt,
        status: 'PENDENTE',
        clientId: 'client-1',
        serviceOrderId: 'os-1',
      },
    });
  });

  it('should update expected delivery date when informed', async () => {
    const expectedDeliveryAt = '2030-01-02';
    prismaMock.serviceOrder.findUnique.mockResolvedValue({
      id: 'os-1',
      clientId: 'client-1',
      vehicleId: 'vehicle-1',
      mechanicId: null,
    });
    prismaMock.serviceOrder.update.mockResolvedValue({
      id: 'os-1',
      expectedDeliveryAt: new Date('2030-01-02T12:00:00.000Z'),
    });

    await service.update('os-1', { expectedDeliveryAt });

    expect(prismaMock.serviceOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'os-1' },
        data: expect.objectContaining({
          expectedDeliveryAt: new Date('2030-01-02T12:00:00.000Z'),
        }) as { expectedDeliveryAt: Date },
      }),
    );
  });

  it('should normalize expected delivery ISO values without shifting the selected day', async () => {
    prismaMock.serviceOrder.findUnique.mockResolvedValue({
      id: 'os-1',
      clientId: 'client-1',
      vehicleId: 'vehicle-1',
      mechanicId: null,
    });
    prismaMock.serviceOrder.update.mockResolvedValue({
      id: 'os-1',
      expectedDeliveryAt: new Date('2030-01-02T12:00:00.000Z'),
    });

    await service.update('os-1', { expectedDeliveryAt: '2030-01-02T23:59:59.000Z' });

    expect(prismaMock.serviceOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'os-1' },
        data: expect.objectContaining({
          expectedDeliveryAt: new Date('2030-01-02T12:00:00.000Z'),
        }) as { expectedDeliveryAt: Date },
      }),
    );
  });

  it('should clear expected delivery date when null is informed', async () => {
    prismaMock.serviceOrder.findUnique.mockResolvedValue({
      id: 'os-1',
      clientId: 'client-1',
      vehicleId: 'vehicle-1',
      mechanicId: null,
    });
    prismaMock.serviceOrder.update.mockResolvedValue({
      id: 'os-1',
      expectedDeliveryAt: null,
    });

    await service.update('os-1', { expectedDeliveryAt: null });

    expect(prismaMock.serviceOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'os-1' },
        data: expect.objectContaining({
          expectedDeliveryAt: null,
        }) as { expectedDeliveryAt: null },
      }),
    );
  });

  it('should block expected delivery date earlier than today', async () => {
    prismaMock.serviceOrder.findUnique.mockResolvedValue({
      id: 'os-1',
      clientId: 'client-1',
      vehicleId: 'vehicle-1',
      mechanicId: null,
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await expect(
      service.update('os-1', { expectedDeliveryAt: toDateInputValue(yesterday) }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.serviceOrder.update).not.toHaveBeenCalled();
  });

  it('should return official totals from budget when fetching service order detail', async () => {
    prismaMock.serviceOrder.findUnique.mockResolvedValue({
      id: 'os-1',
      orderNumber: 'OS-123',
      budgetId: 'budget-1',
      clientId: 'client-1',
      vehicleId: 'vehicle-1',
      mechanicId: null,
      problemDescription: 'Falha no freio',
      diagnosis: null,
      servicesPerformed: null,
      vehicleChecklist: null,
      openedAt: new Date('2030-01-01T00:00:00.000Z'),
      expectedDeliveryAt: null,
      finishedAt: null,
      deliveredAt: null,
      status: ServiceOrderStatus.ABERTA,
      notes: null,
      createdAt: new Date('2030-01-01T00:00:00.000Z'),
      updatedAt: new Date('2030-01-01T00:00:00.000Z'),
      budget: {
        discount: new Prisma.Decimal(10),
        total: new Prisma.Decimal(170),
        items: [
          {
            id: 'item-1',
            type: 'PART',
            inventoryItemId: 'inv-1',
            serviceCode: null,
            description: 'Lampada led',
            quantity: 1,
            unitPrice: new Prisma.Decimal(40),
            totalPrice: new Prisma.Decimal(40),
            inventoryItem: {
              id: 'inv-1',
              name: 'Lampada led',
              internalCode: 'P-000001',
              salePrice: new Prisma.Decimal(40),
            },
            serviceCatalogItem: null,
          },
          {
            id: 'item-2',
            type: 'LABOR_AND_PART',
            inventoryItemId: 'inv-2',
            serviceCode: 'SRV-2',
            description: 'Troca',
            quantity: 1,
            unitPrice: new Prisma.Decimal(100),
            totalPrice: new Prisma.Decimal(100),
            inventoryItem: {
              id: 'inv-2',
              name: 'Soquete',
              internalCode: 'P-000002',
              salePrice: new Prisma.Decimal(30),
            },
            serviceCatalogItem: {
              id: 'srv-2',
              laborPrice: new Prisma.Decimal(70),
              suggestedTotalPrice: new Prisma.Decimal(70),
            },
          },
          {
            id: 'item-3',
            type: 'LABOR',
            inventoryItemId: null,
            serviceCode: 'SRV-1',
            description: 'Diagnóstico',
            quantity: 1,
            unitPrice: new Prisma.Decimal(40),
            totalPrice: new Prisma.Decimal(40),
            inventoryItem: null,
            serviceCatalogItem: null,
          },
        ],
      },
      client: { id: 'client-1', name: 'Cliente', document: null },
      vehicle: { id: 'vehicle-1', plate: 'ABC1234', brand: 'Ford', model: 'Ka', year: 2020 },
      mechanic: null,
      parts: [],
    });

    const result = await service.findOne('os-1');

    expect(result.partsTotal.toNumber()).toBe(70);
    expect(result.laborTotal.toNumber()).toBe(110);
    expect(result.discount.toNumber()).toBe(10);
    expect(result.total.toNumber()).toBe(170);
  });

  it('should consolidate part quantities when the same inventory item is added again', async () => {
    prismaMock.serviceOrder.findUnique.mockResolvedValue({ id: 'os-1' });
    prismaMock.serviceOrderPart.findFirst.mockResolvedValue({
      id: 'part-1',
      quantity: 2,
    });
    prismaMock.serviceOrderPart.update.mockResolvedValue({
      id: 'part-1',
      serviceOrderId: 'os-1',
      inventoryItemId: 'item-1',
      quantity: 5,
      unitPrice: 15,
      totalPrice: 75,
      createdAt: new Date(),
      updatedAt: new Date(),
      inventoryItem: {
        id: 'item-1',
        name: 'Pastilha',
        internalCode: 'P-001',
      },
    });

    await service.addPart('os-1', {
      inventoryItemId: 'item-1',
      quantity: 3,
      unitPrice: 15,
    });

    expect(inventoryServiceMock.reserveOrConsumePart).toHaveBeenCalledWith(
      'item-1',
      3,
      prismaMock,
      expect.objectContaining({
        serviceOrderId: 'os-1',
        serviceOrderPartId: 'part-1',
      }),
    );
    expect(prismaMock.serviceOrderPart.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'part-1' },
        data: {
          quantity: 5,
          unitPrice: 15,
          totalPrice: 75,
        },
      }),
    );
  });

  it('should create a new part line when the item is not yet linked to the service order', async () => {
    prismaMock.serviceOrder.findUnique.mockResolvedValue({ id: 'os-1' });
    prismaMock.serviceOrderPart.findFirst.mockResolvedValue(null);
    prismaMock.serviceOrderPart.create.mockResolvedValue({
      id: 'part-2',
      serviceOrderId: 'os-1',
      inventoryItemId: 'item-2',
      quantity: 1,
      unitPrice: 99.9,
      totalPrice: 99.9,
      createdAt: new Date(),
      updatedAt: new Date(),
      inventoryItem: {
        id: 'item-2',
        name: 'Filtro',
        internalCode: 'F-001',
      },
    });

    await service.addPart('os-1', {
      inventoryItemId: 'item-2',
      quantity: 1,
      unitPrice: 99.9,
    });

    expect(prismaMock.serviceOrderPart.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          serviceOrderId: 'os-1',
          inventoryItemId: 'item-2',
          quantity: 1,
          unitPrice: 99.9,
          totalPrice: 99.9,
        },
      }),
    );
  });

  it('should block creation when vehicle does not belong to informed client', async () => {
    clientsServiceMock.ensureExists.mockResolvedValue({ id: 'client-1' });
    vehiclesServiceMock.ensureExists.mockResolvedValue({ id: 'vehicle-1', clientId: 'client-2' });

    await expect(
      service.create({
        clientId: 'client-1',
        vehicleId: 'vehicle-1',
        problemDescription: 'Teste',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should validate mechanic when creating service order', async () => {
    clientsServiceMock.ensureExists.mockResolvedValue({ id: 'client-1' });
    vehiclesServiceMock.ensureExists.mockResolvedValue({ id: 'vehicle-1', clientId: 'client-1' });
    prismaMock.serviceOrder.create.mockResolvedValue({ id: 'os-1' });

    await service.create({
      clientId: 'client-1',
      vehicleId: 'vehicle-1',
      mechanicId: 'user-1',
      problemDescription: 'Teste',
    });

    expect(usersServiceMock.findById).toHaveBeenCalledWith('user-1');
  });

  it('should throw when service order does not exist', async () => {
    prismaMock.serviceOrder.findUnique.mockResolvedValue(null);

    await expect(service.ensureExists('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
