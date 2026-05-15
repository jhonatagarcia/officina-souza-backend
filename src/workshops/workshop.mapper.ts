import { Workshop } from '@prisma/client';
import { FiscalProfileDto, FiscalProfileStatus } from 'src/workshops/dto/fiscal-profile.dto';
import { WorkshopResponseDto } from 'src/workshops/dto/workshop-response.dto';

const MISSING_CNPJ_BLOCKING_REASON =
  'Cadastro fiscal incompleto: informe o CNPJ da oficina para usar funcionalidades fiscais.';

export function buildFiscalProfile(workshop: Pick<Workshop, 'cnpj'>): FiscalProfileDto {
  const hasCnpj = Boolean(workshop.cnpj);

  return {
    status: hasCnpj ? FiscalProfileStatus.COMPLETE : FiscalProfileStatus.INCOMPLETE,
    hasCnpj,
    canUseFiscalFeatures: hasCnpj,
    blockingReason: hasCnpj ? null : MISSING_CNPJ_BLOCKING_REASON,
  };
}

export function toWorkshopResponseDto(workshop: Workshop): WorkshopResponseDto {
  return {
    id: workshop.id,
    tradeName: workshop.tradeName,
    cnpj: workshop.cnpj,
    isActive: workshop.isActive,
    fiscalProfile: buildFiscalProfile(workshop),
    createdAt: workshop.createdAt,
    updatedAt: workshop.updatedAt,
  };
}
