import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FiscalProfileDto } from 'src/workshops/dto/fiscal-profile.dto';

export class WorkshopResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tradeName!: string;

  @ApiPropertyOptional({ nullable: true, description: 'CNPJ normalizado com 14 digitos.' })
  cnpj!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: FiscalProfileDto })
  fiscalProfile!: FiscalProfileDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
