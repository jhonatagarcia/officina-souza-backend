import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { InventoryService } from 'src/inventory/inventory.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;

  const prismaMock = {
    inventoryItem: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [InventoryService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = moduleRef.get(InventoryService);
  });

  it('should block creation when internal code already exists', async () => {
    prismaMock.inventoryItem.findFirst.mockResolvedValue({ id: 'item-1' });

    await expect(
      service.create({
        name: 'Filtro de óleo',
        internalCode: 'F-001',
        quantity: 10,
        minimumQuantity: 2,
        cost: 10,
        salePrice: 20,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should generate internal code automatically when none is provided', async () => {
    prismaMock.inventoryItem.findFirst
      .mockResolvedValueOnce({ internalCode: 'P-000123' })
      .mockResolvedValueOnce(null);
    prismaMock.inventoryItem.create.mockResolvedValue({
      id: 'item-1',
      name: 'Filtro de óleo',
      internalCode: 'P-000124',
      quantity: 10,
      minimumQuantity: 2,
      cost: 10,
    });

    await service.create({
      name: 'Filtro de óleo',
      quantity: 10,
      minimumQuantity: 2,
      cost: 10,
      salePrice: 20,
    });

    expect(prismaMock.inventoryItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        internalCode: 'P-000124',
      }),
    });
  });

  it('should return only low stock items', async () => {
    prismaMock.inventoryItem.findMany.mockResolvedValue([
      { id: '1', quantity: 1, minimumQuantity: 2 },
      { id: '2', quantity: 5, minimumQuantity: 2 },
      { id: '3', quantity: 2, minimumQuantity: 2 },
      { id: '4', quantity: 15, minimumQuantity: 10 },
      { id: '5', quantity: 16, minimumQuantity: 10 },
    ]);

    const result = await service.getLowStockAlerts();

    expect(result).toHaveLength(3);
    expect(result.map((item) => item.id)).toEqual(['1', '3', '4']);
  });

  it('should reserve stock atomically and return updated item', async () => {
    const tx = {
      inventoryItem: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'item-1', quantity: 7, cost: 10 }),
        findUnique: jest.fn(),
      },
      inventoryMovement: {
        create: jest.fn(),
      },
    };

    const result = await service.reserveOrConsumePart('item-1', 3, tx as never);

    expect(tx.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'item-1',
        quantity: {
          gte: 3,
        },
      },
      data: {
        quantity: {
          decrement: 3,
        },
      },
    });
    expect(result).toEqual({ id: 'item-1', quantity: 7, cost: 10 });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          inventoryItemId: 'item-1',
          quantityChange: -3,
          quantityBefore: 10,
          quantityAfter: 7,
        }),
      }),
    );
  });

  it('should block reserve when quantity is zero or negative', async () => {
    const tx = {
      inventoryItem: {
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
    };

    await expect(service.reserveOrConsumePart('item-1', 0, tx as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should throw not found when reserve target does not exist', async () => {
    const tx = {
      inventoryItem: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue(null),
        findUniqueOrThrow: jest.fn(),
      },
    };

    await expect(service.reserveOrConsumePart('item-1', 2, tx as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should block reserve when available quantity is insufficient', async () => {
    const tx = {
      inventoryItem: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue({ id: 'item-1', quantity: 1 }),
        findUniqueOrThrow: jest.fn(),
      },
    };

    await expect(service.reserveOrConsumePart('item-1', 2, tx as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
