import type { Role } from 'src/common/enums/role.enum';

export interface RequestUser {
  sub: string;
  email: string;
  role: Role;
}
