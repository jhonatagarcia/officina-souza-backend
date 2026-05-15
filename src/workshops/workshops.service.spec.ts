import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { FiscalProfileStatus } from 'src/workshops/dto/fiscal-profile.dto';
import { WorkshopsService } from 'src/workshops/workshops.service';

describe('WorkshopsService', () => {
  let service: WorkshopsService;

  const now = new Date('2026-05-14T12:00:00.000Z');
  const prismaMock = {
    workshop: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [WorkshopsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = moduleRef.get(WorkshopsService);
  });

  it('should create workshop profile with complete fiscal state when CNPJ is provided', async () => {
    prismaMock.workshop.findFirst.mockResolvedValue(null);
    prismaMock.workshop.create.mockResolvedValue({
      id: 'workshop-1',
      tradeName: 'Oficina Paiva',
      cnpj: '11222333000181',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.upsertProfile({
      tradeName: ' Oficina Paiva ',
      cnpj: '11.222.333/0001-81',
    });

    expect(prismaMock.workshop.create).toHaveBeenCalledWith({
      data: {
        tradeName: 'Oficina Paiva',
        cnpj: '11222333000181',
        isActive: true,
      },
    });
    expect(result.fiscalProfile).toEqual({
      status: FiscalProfileStatus.COMPLETE,
      hasCnpj: true,
      canUseFiscalFeatures: true,
      blockingReason: null,
    });
  });

  it('should create workshop profile with incomplete fiscal state when CNPJ is absent', async () => {
    prismaMock.workshop.findFirst.mockResolvedValue(null);
    prismaMock.workshop.create.mockResolvedValue({
      id: 'workshop-1',
      tradeName: 'Oficina sem CNPJ',
      cnpj: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.upsertProfile({
      tradeName: 'Oficina sem CNPJ',
    });

    expect(prismaMock.workshop.create).toHaveBeenCalledWith({
      data: {
        tradeName: 'Oficina sem CNPJ',
        cnpj: null,
        isActive: true,
      },
    });
    expect(result.fiscalProfile.status).toBe(FiscalProfileStatus.INCOMPLETE);
    expect(result.fiscalProfile.hasCnpj).toBe(false);
    expect(result.fiscalProfile.canUseFiscalFeatures).toBe(false);
    expect(result.fiscalProfile.blockingReason).toContain('Cadastro fiscal incompleto');
  });

  it('should update existing workshop profile and keep response contract consistent', async () => {
    prismaMock.workshop.findFirst.mockResolvedValue({
      id: 'workshop-1',
      tradeName: 'Nome antigo',
      cnpj: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    prismaMock.workshop.update.mockResolvedValue({
      id: 'workshop-1',
      tradeName: 'Nome novo',
      cnpj: '11222333000181',
      isActive: false,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.upsertProfile({
      tradeName: 'Nome novo',
      cnpj: '11.222.333/0001-81',
      isActive: false,
    });

    expect(prismaMock.workshop.update).toHaveBeenCalledWith({
      where: { id: 'workshop-1' },
      data: {
        tradeName: 'Nome novo',
        cnpj: '11222333000181',
        isActive: false,
      },
    });
    expect(Object.keys(result).sort()).toEqual(
      ['cnpj', 'createdAt', 'fiscalProfile', 'id', 'isActive', 'tradeName', 'updatedAt'].sort(),
    );
    expect(result.fiscalProfile.status).toBe(FiscalProfileStatus.COMPLETE);
  });

  it('should update the authenticated workshop instead of the first workshop when scoped', async () => {
    prismaMock.workshop.findUnique.mockResolvedValue({
      id: 'workshop-2',
      tradeName: 'Tenant correto',
      cnpj: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    prismaMock.workshop.update.mockResolvedValue({
      id: 'workshop-2',
      tradeName: 'Tenant correto',
      cnpj: '11222333000181',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await service.upsertProfile(
      {
        tradeName: 'Tenant correto',
        cnpj: '11.222.333/0001-81',
      },
      'workshop-2',
    );

    expect(prismaMock.workshop.findUnique).toHaveBeenCalledWith({
      where: { id: 'workshop-2' },
    });
    expect(prismaMock.workshop.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.workshop.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'workshop-2' } }),
    );
  });

  it('should reject duplicated CNPJ safely', async () => {
    prismaMock.workshop.findFirst.mockResolvedValue(null);
    prismaMock.workshop.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );

    await expect(
      service.upsertProfile({
        tradeName: 'Oficina duplicada',
        cnpj: '11.222.333/0001-81',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should return not found when profile was not created yet', async () => {
    prismaMock.workshop.findFirst.mockResolvedValue(null);

    await expect(service.getProfile()).rejects.toBeInstanceOf(NotFoundException);
  });
});
