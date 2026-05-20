import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';
import { Match } from 'src/common/validators/match.validator';
import { STRONG_PASSWORD_MESSAGE, STRONG_PASSWORD_PATTERN } from 'src/auth/utils/password-policy';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(32)
  token!: string;

  @ApiProperty()
  @ValidateIf((dto: ResetPasswordDto) => dto.password === undefined)
  @IsString()
  @MinLength(8)
  @Matches(STRONG_PASSWORD_PATTERN, {
    message: STRONG_PASSWORD_MESSAGE,
  })
  newPassword?: string;

  @ApiProperty()
  @ValidateIf((dto: ResetPasswordDto) => dto.newPassword !== undefined)
  @IsString()
  @Match('newPassword', { message: 'confirmPassword must match newPassword' })
  confirmPassword?: string;

  @ApiPropertyOptional({ description: 'Alias legado para newPassword.' })
  @ValidateIf((dto: ResetPasswordDto) => dto.newPassword === undefined)
  @IsString()
  @MinLength(8)
  @Matches(STRONG_PASSWORD_PATTERN, {
    message: STRONG_PASSWORD_MESSAGE,
  })
  password?: string;

  @ApiPropertyOptional({ description: 'Alias legado para confirmPassword.' })
  @ValidateIf((dto: ResetPasswordDto) => dto.password !== undefined)
  @IsString()
  @Match('password', { message: 'passwordConfirmation must match password' })
  passwordConfirmation?: string;

  @ApiPropertyOptional({ description: 'Token de captcha quando CAPTCHA_ENABLED=true.' })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}
