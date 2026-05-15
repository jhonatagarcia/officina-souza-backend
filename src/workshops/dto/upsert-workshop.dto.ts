import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsCnpj } from 'src/workshops/utils/cnpj.validator';

export class UpsertWorkshopDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  tradeName!: string;

  @ApiPropertyOptional({
    description: 'CNPJ opcional. Quando informado, pode conter mascara e sera normalizado.',
    example: '12.345.678/0001-95',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @IsCnpj()
  cnpj?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWorkshopDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  tradeName?: string;

  @ApiPropertyOptional({
    description: 'CNPJ opcional. Quando informado, pode conter mascara e sera normalizado.',
    example: '12.345.678/0001-95',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @IsCnpj()
  cnpj?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
