import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Match } from 'src/common/validators/match.validator';
import { STRONG_PASSWORD_MESSAGE, STRONG_PASSWORD_PATTERN } from 'src/auth/utils/password-policy';
import { IsCnpj } from 'src/workshops/utils/cnpj.validator';

export class RegisterDto {
  @ApiProperty({ description: 'Nome fantasia da oficina.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  tradeName!: string;

  @ApiPropertyOptional({
    description: 'CNPJ opcional conforme regra fiscal atual. Pode conter mascara.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @IsCnpj()
  cnpj?: string | null;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(STRONG_PASSWORD_PATTERN, {
    message: STRONG_PASSWORD_MESSAGE,
  })
  password!: string;

  @ApiProperty()
  @IsString()
  @Match('password', { message: 'passwordConfirmation must match password' })
  passwordConfirmation!: string;

  @ApiPropertyOptional({ description: 'Token de captcha quando CAPTCHA_ENABLED=true.' })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}
