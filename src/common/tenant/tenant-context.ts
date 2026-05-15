import { ForbiddenException } from '@nestjs/common';
import type { RequestUser } from 'src/common/types/request-user.type';

export function requireWorkshopId(user: RequestUser | undefined): string {
  if (!user?.workshopId) {
    throw new ForbiddenException('Contexto da oficina obrigatorio');
  }

  return user.workshopId;
}
