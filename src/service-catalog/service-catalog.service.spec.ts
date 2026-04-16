/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { ServiceBillingType } from 'src/common/enums/service-billing-type.enum';
import { ServiceMaterialSource } from 'src/common/enums/service-material-source.enum';
import { PrismaService } from 'src/prisma/prisma.service';
import { ServiceCatalogService } from 'src/service-catalog/service-catalog.service';

describe('ServiceCatalogService', () => {
  let service: ServiceCatalogService;

  const prismaMock = {
    serviceCatalogItem: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [ServiceCatalogService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = moduleRef.get(ServiceCatalogService);
  });

  it('should create service catalog item successfully with calculated suggestedTotalPrice', async () => {
    prismaMock.serviceCatalogItem.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    prismaMock.serviceCatalogItem.create.mockResolvedValue({
      id: 'svc-1',
      code: 'SRV-001',
      name: 'Troca de oleo',
      category: 'manutencao',
      description: null,
      internalNotes: null,
      laborPrice: new Prisma.Decimal(80),
      productPrice: new Prisma.Decimal(120),
      suggestedTotalPrice: new Prisma.Decimal(200),
      billingType: ServiceBillingType.PARTS_AND_LABOR,
      materialSource: ServiceMaterialSource.SHOP_SUPPLIES,
      warrantyDays: 90,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({
      code: 'srv-001',
      name: 'Troca de oleo',
      category: 'manutencao',
      laborPrice: 80,
      productPrice: 120,
      billingType: ServiceBillingType.PARTS_AND_LABOR,
      materialSource: ServiceMaterialSource.SHOP_SUPPLIES,
      warrantyDays: 90,
    });

    expect(prismaMock.serviceCatalogItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: 'SRV-001',
        suggestedTotalPrice: new Prisma.Decimal(200),
      }),
    });
    expect(result.code).toBe('SRV-001');
    expect(result.suggestedTotalPrice.toString()).toBe('200');
  });

  it('should generate service code automatically when none is provided', async () => {
    prismaMock.serviceCatalogItem.findFirst
      .mockResolvedValueOnce({ code: 'SRV-000123' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prismaMock.serviceCatalogItem.create.mockResolvedValue({
      id: 'svc-2',
      code: 'SRV-000124',
      name: 'Alinhamento',
      category: 'suspensao',
      description: null,
      internalNotes: null,
      laborPrice: new Prisma.Decimal(100),
      productPrice: new Prisma.Decimal(0),
      suggestedTotalPrice: new Prisma.Decimal(100),
      billingType: ServiceBillingType.LABOR_ONLY,
      materialSource: ServiceMaterialSource.NO_PARTS_REQUIRED,
      warrantyDays: 30,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.create({
      name: 'Alinhamento',
      category: 'suspensao',
      laborPrice: 100,
      productPrice: 0,
      billingType: ServiceBillingType.LABOR_ONLY,
      materialSource: ServiceMaterialSource.NO_PARTS_REQUIRED,
      warrantyDays: 30,
    });

    expect(prismaMock.serviceCatalogItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: 'SRV-000124',
      }),
    });
  });

  it('should block creation when code already exists', async () => {
    prismaMock.serviceCatalogItem.findFirst.mockResolvedValue({ id: 'svc-1' });

    await expect(
      service.create({
        code: 'SRV-001',
        name: 'Troca de oleo',
        category: 'manutencao',
        laborPrice: 80,
        productPrice: 120,
        billingType: ServiceBillingType.PARTS_AND_LABOR,
        materialSource: ServiceMaterialSource.SHOP_SUPPLIES,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should block negative monetary values', async () => {
    prismaMock.serviceCatalogItem.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        code: 'SRV-001',
        name: 'Troca de oleo',
        category: 'manutencao',
        laborPrice: -1,
        productPrice: 0,
        billingType: ServiceBillingType.LABOR_ONLY,
        materialSource: ServiceMaterialSource.NO_PARTS_REQUIRED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should enforce LABOR_ONLY and material source consistency', async () => {
    prismaMock.serviceCatalogItem.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        code: 'SRV-002',
        name: 'Mao de obra avulsa',
        category: 'geral',
        laborPrice: 100,
        productPrice: 10,
        billingType: ServiceBillingType.LABOR_ONLY,
        materialSource: ServiceMaterialSource.SHOP_SUPPLIES,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should return paginated listing without applying active filter by default', async () => {
    prismaMock.serviceCatalogItem.findMany.mockReturnValue('findManyResult');
    prismaMock.serviceCatalogItem.count.mockReturnValue('countResult');
    prismaMock.$transaction.mockResolvedValue([
      [
        {
          id: 'svc-1',
          code: 'SRV-001',
          name: 'Troca de oleo',
          category: 'manutencao',
          description: null,
          internalNotes: null,
          laborPrice: new Prisma.Decimal(80),
          productPrice: new Prisma.Decimal(120),
          suggestedTotalPrice: new Prisma.Decimal(200),
          billingType: ServiceBillingType.PARTS_AND_LABOR,
          materialSource: ServiceMaterialSource.SHOP_SUPPLIES,
          warrantyDays: 90,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      1,
    ]);

    const result = await service.findAll({
      page: 1,
      limit: 10,
      sortOrder: 'desc',
    });

    expect(prismaMock.serviceCatalogItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
    expect(prismaMock.serviceCatalogItem.count).toHaveBeenCalledWith({
      where: {},
    });
    expect(prismaMock.$transaction).toHaveBeenCalledWith(['findManyResult', 'countResult']);
    expect(result.meta.total).toBe(1);
    expect(result.data).toHaveLength(1);
  });

  it('should activate and deactivate service catalog items', async () => {
    prismaMock.serviceCatalogItem.findUnique.mockResolvedValue({
      id: 'svc-1',
      code: 'SRV-001',
      active: false,
    });
    prismaMock.serviceCatalogItem.update
      .mockResolvedValueOnce({
        id: 'svc-1',
        code: 'SRV-001',
        name: 'Troca de oleo',
        category: 'manutencao',
        description: null,
        internalNotes: null,
        laborPrice: new Prisma.Decimal(80),
        productPrice: new Prisma.Decimal(120),
        suggestedTotalPrice: new Prisma.Decimal(200),
        billingType: ServiceBillingType.PARTS_AND_LABOR,
        materialSource: ServiceMaterialSource.SHOP_SUPPLIES,
        warrantyDays: 90,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: 'svc-1',
        code: 'SRV-001',
        name: 'Troca de oleo',
        category: 'manutencao',
        description: null,
        internalNotes: null,
        laborPrice: new Prisma.Decimal(80),
        productPrice: new Prisma.Decimal(120),
        suggestedTotalPrice: new Prisma.Decimal(200),
        billingType: ServiceBillingType.PARTS_AND_LABOR,
        materialSource: ServiceMaterialSource.SHOP_SUPPLIES,
        warrantyDays: 90,
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    const activated = await service.activate('svc-1');
    const deactivated = await service.deactivate('svc-1');

    expect(activated.active).toBe(true);
    expect(deactivated.active).toBe(false);
  });

  it('should throw not found when activating non existing item', async () => {
    prismaMock.serviceCatalogItem.findUnique.mockResolvedValue(null);

    await expect(service.activate('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
