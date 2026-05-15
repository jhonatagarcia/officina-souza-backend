/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from 'src/auth/auth.service';
import { CaptchaService } from 'src/auth/services/captcha.service';
import { PasswordResetEmailService } from 'src/auth/services/password-reset-email.service';
import { PasswordResetTokenService } from 'src/auth/services/password-reset-token.service';
import { FiscalProfileStatus } from 'src/workshops/dto/fiscal-profile.dto';

describe('AuthService', () => {
  const now = new Date('2026-05-15T12:00:00.000Z');
  const workshop = {
    id: 'workshop-1',
    tradeName: 'Oficina Paiva',
    cnpj: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  const user = {
    id: 'user-1',
    workshopId: workshop.id,
    name: 'Oficina Paiva',
    email: 'admin@oficina.com',
    passwordHash: 'hash',
    role: Role.ADMIN,
    isActive: true,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    workshop: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const usersServiceMock = {
    validateCredentials: jest.fn(),
    findById: jest.fn(),
  };
  const jwtServiceMock = {
    signAsync: jest.fn(),
  };
  const configServiceMock = {
    getOrThrow: jest.fn(),
  };
  const captchaServiceMock = {
    verify: jest.fn(),
  };
  const resetTokenServiceMock = {
    create: jest.fn(),
    consumeValidToken: jest.fn(),
    revokeActiveTokensForUser: jest.fn(),
  };
  const resetEmailServiceMock = {
    sendPasswordReset: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    configServiceMock.getOrThrow.mockImplementation((key: string) => {
      if (key === 'auth.bcryptSaltRounds') return 4;
      return 'value';
    });
    jwtServiceMock.signAsync.mockResolvedValue('jwt-token');
    service = new AuthService(
      usersServiceMock as never,
      jwtServiceMock as unknown as JwtService,
      prismaMock as never,
      configServiceMock as never,
      captchaServiceMock as unknown as CaptchaService,
      resetTokenServiceMock as unknown as PasswordResetTokenService,
      resetEmailServiceMock as unknown as PasswordResetEmailService,
    );
  });

  it('should register workshop and admin user successfully without leaking password', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      ...user,
      passwordHash: 'stored-hash',
      workshop,
    });
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => unknown) =>
        callback({
          ...prismaMock,
          workshop: { create: jest.fn().mockResolvedValue(workshop) },
          user: { ...prismaMock.user, create: jest.fn().mockResolvedValue(user) },
        }),
    );

    const result = await service.register({
      tradeName: 'Oficina Paiva',
      cnpj: null,
      email: 'ADMIN@OFICINA.COM',
      password: 'Admin123',
      passwordConfirmation: 'Admin123',
    });

    expect(captchaServiceMock.verify).toHaveBeenCalledWith(undefined, 'register');
    expect(result.accessToken).toBe('jwt-token');
    expect(result.user).toMatchObject({
      id: 'user-1',
      email: 'admin@oficina.com',
      role: Role.ADMIN,
      workshop: {
        id: 'workshop-1',
        name: 'Oficina Paiva',
        cnpj: null,
        fiscalStatus: FiscalProfileStatus.INCOMPLETE,
        fiscalRegistrationComplete: false,
      },
    });
    expect(JSON.stringify(result)).not.toContain('password');
  });

  it('should block duplicated email on register', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(user);

    await expect(
      service.register({
        tradeName: 'Oficina Paiva',
        email: 'admin@oficina.com',
        password: 'Admin123',
        passwordConfirmation: 'Admin123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should login successfully and include workshop context', async () => {
    usersServiceMock.validateCredentials.mockResolvedValue(user);
    prismaMock.user.findUnique.mockResolvedValue({
      ...user,
      workshop: { ...workshop, cnpj: '11222333000181' },
    });

    const result = await service.login({
      email: 'admin@oficina.com',
      password: 'Admin123',
    });

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      role: user.role,
      workshopId: user.workshopId,
    });
    expect(result.user.workshop?.name).toBe('Oficina Paiva');
    expect(result.user.workshopFiscalStatus).toBe(FiscalProfileStatus.COMPLETE);
  });

  it('should return safe invalid credentials on login failure', async () => {
    usersServiceMock.validateCredentials.mockRejectedValue(
      new UnauthorizedException('Credenciais invalidas'),
    );

    await expect(
      service.login({
        email: 'admin@oficina.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should generate password reset token and send email for active user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user);
    resetTokenServiceMock.create.mockResolvedValue({
      token: 'raw-reset-token',
      expiresAt: now,
    });

    const result = await service.forgotPassword({ email: 'admin@oficina.com' });

    expect(resetTokenServiceMock.create).toHaveBeenCalledWith(user.id);
    expect(resetEmailServiceMock.sendPasswordReset).toHaveBeenCalledWith({
      email: user.email,
      token: 'raw-reset-token',
      expiresAt: now,
    });
    expect(result.message).toContain('Se o e-mail estiver cadastrado');
  });

  it('should not enumerate users on forgot password', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const result = await service.forgotPassword({ email: 'missing@oficina.com' });

    expect(resetTokenServiceMock.create).not.toHaveBeenCalled();
    expect(result.message).toContain('Se o e-mail estiver cadastrado');
  });

  it('should reset password when token is valid', async () => {
    resetTokenServiceMock.consumeValidToken.mockResolvedValue(user.id);
    prismaMock.user.update.mockResolvedValue(user);

    await service.resetPassword({
      token: 'valid-reset-token',
      password: 'NewPass123',
      passwordConfirmation: 'NewPass123',
    });

    const updateCall = prismaMock.user.update.mock.calls[0]?.[0] as {
      data: { passwordHash: string };
    };
    expect(updateCall.data.passwordHash).not.toBe('NewPass123');
    await expect(bcrypt.compare('NewPass123', updateCall.data.passwordHash)).resolves.toBe(true);
    expect(resetTokenServiceMock.revokeActiveTokensForUser).toHaveBeenCalledWith(user.id);
  });

  it('should fail reset when token is invalid or expired', async () => {
    resetTokenServiceMock.consumeValidToken.mockResolvedValue(null);

    await expect(
      service.resetPassword({
        token: 'expired-reset-token',
        password: 'NewPass123',
        passwordConfirmation: 'NewPass123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
