import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Match } from 'src/common/validators/match.validator';
import { STRONG_PASSWORD_MESSAGE, STRONG_PASSWORD_PATTERN } from 'src/auth/utils/password-policy';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(32)
  token!: string;

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
