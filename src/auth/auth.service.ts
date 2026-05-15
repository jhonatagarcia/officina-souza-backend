import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User, Workshop } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { MessageResponseDto } from 'src/auth/dto/message-response.dto';
import { AuthResponseDto } from 'src/auth/dto/auth-response.dto';
import { ForgotPasswordDto } from 'src/auth/dto/forgot-password.dto';
import { LoginDto } from 'src/auth/dto/login.dto';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { ResetPasswordDto } from 'src/auth/dto/reset-password.dto';
import { CaptchaService } from 'src/auth/services/captcha.service';
import { PasswordResetEmailService } from 'src/auth/services/password-reset-email.service';
import { PasswordResetTokenService } from 'src/auth/services/password-reset-token.service';
import type { RequestUser } from 'src/common/types/request-user.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { normalizeCnpj } from 'src/workshops/utils/cnpj.util';
import { FiscalProfileStatus } from 'src/workshops/dto/fiscal-profile.dto';
import { buildFiscalProfile } from 'src/workshops/workshop.mapper';

type AuthContextUser = Omit<User, 'passwordHash'> & {
  workshop: Workshop | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly captchaService: CaptchaService,
    private readonly passwordResetTokenService: PasswordResetTokenService,
    private readonly passwordResetEmailService: PasswordResetEmailService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    await this.captchaService.verify(loginDto.captchaToken, 'login');

    const user = await this.usersService.validateCredentials(loginDto.email, loginDto.password);

    return this.buildAuthResponse({
      sub: user.id,
      email: user.email,
      role: user.role,
      workshopId: user.workshopId,
    });
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    await this.captchaService.verify(registerDto.captchaToken, 'register');

    const email = this.normalizeEmail(registerDto.email);
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException('E-mail ja cadastrado');
    }

    const passwordHash = await bcrypt.hash(
      registerDto.password,
      this.configService.getOrThrow<number>('auth.bcryptSaltRounds'),
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const workshop = await tx.workshop.create({
        data: {
          tradeName: registerDto.tradeName.trim(),
          cnpj: normalizeCnpj(registerDto.cnpj),
          isActive: true,
        },
      });

      const user = await tx.user.create({
        data: {
          workshopId: workshop.id,
          name: registerDto.tradeName.trim(),
          email,
          passwordHash,
          role: Role.ADMIN,
          isActive: true,
        },
      });

      return { user, workshop };
    });

    return this.buildAuthResponse({
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
      workshopId: result.workshop.id,
    });
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    await this.captchaService.verify(dto.captchaToken, 'forgot-password');

    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(dto.email) },
    });

    if (user?.isActive) {
      try {
        const resetToken = await this.passwordResetTokenService.create(user.id);
        await this.passwordResetEmailService.sendPasswordReset({
          email: user.email,
          token: resetToken.token,
          expiresAt: resetToken.expiresAt,
        });
      } catch {
        // Keep the public response identical to avoid account enumeration.
      }
    }

    return {
      message: 'Se o e-mail estiver cadastrado, enviaremos instrucoes para redefinir a senha.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponseDto> {
    await this.captchaService.verify(dto.captchaToken, 'reset-password');

    const userId = await this.passwordResetTokenService.consumeValidToken(dto.token);

    if (!userId) {
      throw new BadRequestException('Token invalido ou expirado');
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      this.configService.getOrThrow<number>('auth.bcryptSaltRounds'),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.passwordResetTokenService.revokeActiveTokensForUser(userId);

    return { message: 'Senha redefinida com sucesso.' };
  }

  async me(userId: string): Promise<AuthResponseDto['user']> {
    const currentUser = await this.findAuthContextUser(userId);
    return this.buildAuthUser(currentUser);
  }

  private async buildAuthResponse(user: RequestUser): Promise<AuthResponseDto> {
    const accessToken = await this.jwtService.signAsync(user);
    const currentUser = await this.findAuthContextUser(user.sub);

    return {
      accessToken,
      user: this.buildAuthUser(currentUser),
    };
  }

  private async findAuthContextUser(userId: string): Promise<AuthContextUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { workshop: true },
    });

    if (!user) {
      throw new BadRequestException('Usuario invalido');
    }

    const { passwordHash, ...safeUser } = user;
    void passwordHash;
    return safeUser;
  }

  private buildAuthUser(user: AuthContextUser): AuthResponseDto['user'] {
    const fiscalProfile = user.workshop ? buildFiscalProfile({ cnpj: user.workshop.cnpj }) : null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      workshop: user.workshop
        ? {
            id: user.workshop.id,
            name: user.workshop.tradeName,
            tradeName: user.workshop.tradeName,
            cnpj: user.workshop.cnpj,
            fiscalStatus: fiscalProfile?.status ?? FiscalProfileStatus.INCOMPLETE,
            fiscalRegistrationComplete: fiscalProfile?.canUseFiscalFeatures ?? false,
          }
        : null,
      workshopFiscalStatus: fiscalProfile?.status ?? FiscalProfileStatus.INCOMPLETE,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
