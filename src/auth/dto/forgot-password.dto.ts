import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'Token de captcha quando CAPTCHA_ENABLED=true.' })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}
