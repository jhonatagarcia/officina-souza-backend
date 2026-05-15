import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FiscalFeatureCode } from 'src/common/enums/fiscal-feature-code.enum';
import { PrismaService } from 'src/prisma/prisma.service';
import { buildFiscalProfile } from 'src/workshops/workshop.mapper';

export interface FiscalFeatureAccessResult {
  feature: FiscalFeatureCode;
  allowed: boolean;
  reason: string | null;
}

@Injectable()
export class FiscalFeatureAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccess(
    feature: FiscalFeatureCode,
    workshopId?: string | null,
  ): Promise<FiscalFeatureAccessResult> {
    const workshop = await this.findWorkshop(workshopId);
    const fiscalProfile = buildFiscalProfile(workshop);

    return {
      feature,
      allowed: fiscalProfile.canUseFiscalFeatures,
      reason: fiscalProfile.blockingReason,
    };
  }

  async assertCanUse(feature: FiscalFeatureCode, workshopId?: string | null): Promise<void> {
    const access = await this.getAccess(feature, workshopId);

    if (!access.allowed) {
      throw new ForbiddenException({
        message: access.reason ?? 'Funcionalidade fiscal bloqueada.',
        code: 'FISCAL_FEATURE_BLOCKED',
        feature: access.feature,
        reason: access.reason,
      });
    }
  }

  private async findWorkshop(workshopId?: string | null) {
    const workshop = workshopId
      ? await this.prisma.workshop.findUnique({ where: { id: workshopId } })
      : await this.prisma.workshop.findFirst({ orderBy: { createdAt: 'asc' } });

    if (!workshop) {
      throw new NotFoundException('Oficina nao cadastrada');
    }

    return workshop;
  }
}
