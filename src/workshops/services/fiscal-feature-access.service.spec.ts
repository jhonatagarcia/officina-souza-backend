import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FiscalFeatureCode } from 'src/common/enums/fiscal-feature-code.enum';
import { PrismaService } from 'src/prisma/prisma.service';
import { FiscalFeatureAccessService } from 'src/workshops/services/fiscal-feature-access.service';

describe('FiscalFeatureAccessService', () => {
  let service: FiscalFeatureAccessService;

  const now = new Date('2026-05-14T12:00:00.000Z');
  const prismaMock = {
    workshop: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [FiscalFeatureAccessService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = moduleRef.get(FiscalFeatureAccessService);
  });

  it('should allow fiscal feature when workshop has CNPJ', async () => {
    prismaMock.workshop.findFirst.mockResolvedValue({
      id: 'workshop-1',
      tradeName: 'Oficina Paiva',
      cnpj: '11222333000181',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await expect(service.assertCanUse(FiscalFeatureCode.FISCAL_DOCUMENTS)).resolves.toBeUndefined();
    await expect(service.getAccess(FiscalFeatureCode.FISCAL_DOCUMENTS)).resolves.toEqual({
      feature: FiscalFeatureCode.FISCAL_DOCUMENTS,
      allowed: true,
      reason: null,
    });
  });

  it('should block fiscal feature when workshop has no CNPJ', async () => {
    prismaMock.workshop.findFirst.mockResolvedValue({
      id: 'workshop-1',
      tradeName: 'Oficina sem CNPJ',
      cnpj: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await expect(service.assertCanUse(FiscalFeatureCode.FISCAL_DOCUMENTS)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    const access = await service.getAccess(FiscalFeatureCode.FISCAL_DOCUMENTS);

    expect(access.feature).toBe(FiscalFeatureCode.FISCAL_DOCUMENTS);
    expect(access.allowed).toBe(false);
    expect(access.reason).toContain('Cadastro fiscal incompleto');
  });

  it('should support explicit workshop lookup for future tenant-scoped calls', async () => {
    prismaMock.workshop.findUnique.mockResolvedValue({
      id: 'workshop-1',
      tradeName: 'Oficina Paiva',
      cnpj: '11222333000181',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await service.getAccess(FiscalFeatureCode.FORMAL_COMPANY_IDENTIFICATION, 'workshop-1');

    expect(prismaMock.workshop.findUnique).toHaveBeenCalledWith({
      where: { id: 'workshop-1' },
    });
  });

  it('should fail clearly when there is no workshop profile', async () => {
    prismaMock.workshop.findFirst.mockResolvedValue(null);

    await expect(service.getAccess(FiscalFeatureCode.FISCAL_REPORTS)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
