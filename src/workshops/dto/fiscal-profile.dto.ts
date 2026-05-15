import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FiscalProfileStatus {
  COMPLETE = 'COMPLETE',
  INCOMPLETE = 'INCOMPLETE',
}

export class FiscalProfileDto {
  @ApiProperty({ enum: FiscalProfileStatus })
  status!: FiscalProfileStatus;

  @ApiProperty()
  hasCnpj!: boolean;

  @ApiProperty()
  canUseFiscalFeatures!: boolean;

  @ApiPropertyOptional({ nullable: true })
  blockingReason!: string | null;
}
