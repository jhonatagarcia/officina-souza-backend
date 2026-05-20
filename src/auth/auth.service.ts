import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role, User, Workshop } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { MessageResponseDto } from 'src/auth/dto/message-response.dto';
import { AuthResponseDto } from 'src/auth/dto/auth-response.dto';
import { ForgotPasswordDto } from 'src/auth/dto/forgot-password.dto';
import { GoogleLoginDto } from 'src/auth/dto/google-login.dto';
import { LoginDto } from 'src/auth/dto/login.dto';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { ResetPasswordDto } from 'src/auth/dto/reset-password.dto';
import { CaptchaService } from 'src/auth/services/captcha.service';
import { GoogleIdentityService } from 'src/auth/services/google-identity.service';
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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly captchaService: CaptchaService,
    private readonly googleIdentityService: GoogleIdentityService,
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

  async loginWithGoogle(dto: GoogleLoginDto): Promise<AuthResponseDto> {
    const googleIdentity = await this.googleIdentityService.verifyCredential(dto.credential);
    const linkedUser = await this.prisma.$transaction(async (tx) => {
      const userByGoogleSubject = await tx.user.findUnique({
        where: { googleSubject: googleIdentity.subject },
      });

      if (userByGoogleSubject) {
        if (!userByGoogleSubject.isActive) {
          throw new UnauthorizedException('Nao foi possivel autenticar com Google');
        }

        const workshopId =
          userByGoogleSubject.workshopId ??
          (await this.createGoogleWorkshopForStandaloneAdmin(
            tx,
            userByGoogleSubject.role,
            googleIdentity.name,
          ));

        return tx.user.update({
          where: { id: userByGoogleSubject.id },
          data: {
            workshopId,
            googleEmailVerified: googleIdentity.emailVerified,
            lastLoginAt: new Date(),
          },
        });
      }

      const userByEmail = await tx.user.findUnique({
        where: { email: googleIdentity.email },
      });

      if (userByEmail) {
        if (!userByEmail.isActive || userByEmail.googleSubject) {
          throw new UnauthorizedException('Nao foi possivel autenticar com Google');
        }

        const workshopId =
          userByEmail.workshopId ??
          (await this.createGoogleWorkshopForStandaloneAdmin(
            tx,
            userByEmail.role,
            googleIdentity.name,
          ));

        return tx.user.update({
          where: { id: userByEmail.id },
          data: {
            workshopId,
            googleSubject: googleIdentity.subject,
            googleEmailVerified: googleIdentity.emailVerified,
            googleLinkedAt: new Date(),
            lastLoginAt: new Date(),
          },
        });
      }

      const passwordHash = await bcrypt.hash(
        this.generateUnusablePassword(),
        this.configService.getOrThrow<number>('auth.bcryptSaltRounds'),
      );

      const workshop = await tx.workshop.create({
        data: {
          tradeName: googleIdentity.name.trim(),
          cnpj: null,
          isActive: true,
        },
      });

      return tx.user.create({
        data: {
          workshopId: workshop.id,
          name: googleIdentity.name,
          email: googleIdentity.email,
          passwordHash,
          googleSubject: googleIdentity.subject,
          googleEmailVerified: googleIdentity.emailVerified,
          googleLinkedAt: new Date(),
          role: Role.ADMIN,
          isActive: true,
          lastLoginAt: new Date(),
        },
      });
    });

    return this.buildAuthResponse({
      sub: linkedUser.id,
      email: linkedUser.email,
      role: linkedUser.role,
      workshopId: linkedUser.workshopId,
    });
  }

  async register(registerDto: RegisterDto): Promise<MessageResponseDto> {
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

    await this.prisma.$transaction(async (tx) => {
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

    return { message: 'Cadastro realizado com sucesso.' };
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
      } catch (error) {
        this.logger.warn(
          `Password reset email could not be delivered: ${this.formatErrorForLog(error)}`,
        );
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

    const newPassword = dto.newPassword ?? dto.password;
    if (!newPassword) {
      throw new BadRequestException('Nova senha obrigatoria');
    }

    const passwordHash = await bcrypt.hash(
      newPassword,
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

  private formatErrorForLog(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'unknown error';
  }

  private async createGoogleWorkshopForStandaloneAdmin(
    tx: Prisma.TransactionClient,
    role: Role,
    tradeName: string,
  ): Promise<string | undefined> {
    if (role !== Role.ADMIN) {
      return undefined;
    }

    const workshop = await tx.workshop.create({
      data: {
        tradeName: tradeName.trim(),
        cnpj: null,
        isActive: true,
      },
    });

    return workshop.id;
  }

  private generateUnusablePassword(): string {
    return randomBytes(32).toString('hex');
  }
}
