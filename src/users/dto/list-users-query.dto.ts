import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Role } from 'src/common/enums/role.enum';

const toBooleanQueryParam = ({ obj, key, value }: { obj: Record<string, unknown>; key: string; value: unknown }) => {
  const rawValue = obj[key] ?? value;

  if (rawValue === undefined || rawValue === null || rawValue === '') return undefined;
  if (rawValue === 'true' || rawValue === true) return true;
  if (rawValue === 'false' || rawValue === false) return false;

  return rawValue;
};

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @Transform(toBooleanQueryParam)
  @IsBoolean()
  active?: boolean;
}
