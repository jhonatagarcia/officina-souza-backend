import { Module } from '@nestjs/common';
import type { StringValue } from 'ms';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';
import { CaptchaService } from 'src/auth/services/captcha.service';
import { GoogleIdentityService } from 'src/auth/services/google-identity.service';
import { PasswordResetEmailService } from 'src/auth/services/password-reset-email.service';
import { PasswordResetTokenService } from 'src/auth/services/password-reset-token.service';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: configService.getOrThrow<StringValue>('auth.jwtExpiresIn'),
          issuer: configService.getOrThrow<string>('auth.jwtIssuer'),
          audience: configService.getOrThrow<string>('auth.jwtAudience'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    CaptchaService,
    GoogleIdentityService,
    PasswordResetTokenService,
    PasswordResetEmailService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
