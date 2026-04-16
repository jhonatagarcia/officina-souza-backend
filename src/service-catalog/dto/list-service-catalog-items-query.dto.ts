import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true' || value === true) {
    return true;
  }

  if (value === 'false' || value === false) {
    return false;
  }

  return value;
};

export class ListServiceCatalogItemsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({
    description: 'Quando informado, filtra por status ativo ou inativo.',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  active?: boolean;
}
