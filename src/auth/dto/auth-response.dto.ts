import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from 'src/common/enums/role.enum';
import { FiscalProfileStatus } from 'src/workshops/dto/fiscal-profile.dto';

class AuthWorkshopDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  tradeName!: string;

  @ApiPropertyOptional({ nullable: true })
  cnpj!: string | null;

  @ApiProperty({ enum: FiscalProfileStatus })
  fiscalStatus!: FiscalProfileStatus;

  @ApiProperty()
  fiscalRegistrationComplete!: boolean;
}

class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiPropertyOptional({ nullable: true, type: AuthWorkshopDto })
  workshop!: AuthWorkshopDto | null;

  @ApiProperty({ enum: FiscalProfileStatus })
  workshopFiscalStatus!: FiscalProfileStatus;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
