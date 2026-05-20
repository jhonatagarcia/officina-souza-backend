/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from 'src/auth/auth.service';
import { CaptchaService } from 'src/auth/services/captcha.service';
import { GoogleIdentityService } from 'src/auth/services/google-identity.service';
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
    googleSubject: null,
    googleEmailVerified: false,
    googleLinkedAt: null,
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
  const googleIdentityServiceMock = {
    verifyCredential: jest.fn(),
  };
  const resetTokenServiceMock = {
    create: jest.fn(),
    consumeValidToken: jest.fn(),
    revokeActiveTokensForUser: jest.fn(),
  };
  const resetEmailServiceMock = {
    sendPasswordReset: jest.fn(),
  };
  const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    configServiceMock.getOrThrow.mockImplementation((key: string) => {
      if (key === 'auth.bcryptSaltRounds') return 4;
      return 'value';
    });
    jwtServiceMock.signAsync.mockResolvedValue('jwt-token');
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock),
    );
    service = new AuthService(
      usersServiceMock as never,
      jwtServiceMock as unknown as JwtService,
      prismaMock as never,
      configServiceMock as never,
      captchaServiceMock as unknown as CaptchaService,
      googleIdentityServiceMock as unknown as GoogleIdentityService,
      resetTokenServiceMock as unknown as PasswordResetTokenService,
      resetEmailServiceMock as unknown as PasswordResetEmailService,
    );
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it('should register workshop and admin user successfully without logging in automatically', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
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
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    expect(result).toEqual({ message: 'Cadastro realizado com sucesso.' });
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

  it('should create a new active admin user from a valid Google token with workshop context', async () => {
    const googleUser = {
      subject: 'google-subject-1',
      email: 'owner@oficina.com',
      name: 'Owner Oficina',
      emailVerified: true,
    };
    const googleCreatedUser = {
      ...user,
      id: 'google-user-1',
      workshopId: workshop.id,
      email: googleUser.email,
      name: googleUser.name,
      googleSubject: googleUser.subject,
      googleEmailVerified: true,
      googleLinkedAt: now,
      lastLoginAt: now,
    };

    googleIdentityServiceMock.verifyCredential.mockResolvedValue(googleUser);
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...googleCreatedUser, workshop });
    prismaMock.workshop.create.mockResolvedValue(workshop);
    prismaMock.user.create.mockResolvedValue(googleCreatedUser);

    const result = await service.loginWithGoogle({ credential: 'valid-google-id-token' });

    expect(googleIdentityServiceMock.verifyCredential).toHaveBeenCalledWith(
      'valid-google-id-token',
    );
    const createCall = prismaMock.user.create.mock.calls[0]?.[0] as {
      data: {
        workshopId: string;
        email: string;
        name: string;
        googleSubject: string;
        googleEmailVerified: boolean;
        role: Role;
        isActive: boolean;
      };
    };
    expect(prismaMock.workshop.create).toHaveBeenCalledWith({
      data: {
        tradeName: googleUser.name,
        cnpj: null,
        isActive: true,
      },
    });
    expect(createCall.data).toMatchObject({ workshopId: workshop.id });
    expect(createCall.data.email).toBe(googleUser.email);
    expect(createCall.data.name).toBe(googleUser.name);
    expect(createCall.data.googleSubject).toBe(googleUser.subject);
    expect(createCall.data.googleEmailVerified).toBe(true);
    expect(createCall.data.role).toBe(Role.ADMIN);
    expect(createCall.data.isActive).toBe(true);
    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: googleCreatedUser.id,
      email: googleCreatedUser.email,
      role: googleCreatedUser.role,
      workshopId: workshop.id,
    });
    expect(result.accessToken).toBe('jwt-token');
    expect(result.user.id).toBe(googleCreatedUser.id);
    expect(result.user.email).toBe(googleCreatedUser.email);
    expect(result.user.workshop?.id).toBe(workshop.id);
    expect(result.user.workshopFiscalStatus).toBe(FiscalProfileStatus.INCOMPLETE);
  });

  it('should link a valid Google identity to an existing active user with the same verified email', async () => {
    const googleUser = {
      subject: 'google-subject-1',
      email: user.email,
      name: 'Google Name',
      emailVerified: true,
    };
    const linkedUser = {
      ...user,
      googleSubject: googleUser.subject,
      googleEmailVerified: true,
      googleLinkedAt: now,
      workshop,
    };

    googleIdentityServiceMock.verifyCredential.mockResolvedValue(googleUser);
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(linkedUser);
    prismaMock.user.update.mockResolvedValue({ ...linkedUser, workshop: undefined });

    await service.loginWithGoogle({ credential: 'valid-google-id-token' });

    const linkUpdateCall = prismaMock.user.update.mock.calls[0]?.[0] as {
      where: { id: string };
      data: {
        googleSubject: string;
        googleEmailVerified: boolean;
        googleLinkedAt: Date;
        lastLoginAt: Date;
      };
    };
    expect(linkUpdateCall.where).toEqual({ id: user.id });
    expect(linkUpdateCall.data.googleSubject).toBe(googleUser.subject);
    expect(linkUpdateCall.data.googleEmailVerified).toBe(true);
    expect(linkUpdateCall.data.googleLinkedAt).toBeInstanceOf(Date);
    expect(linkUpdateCall.data.lastLoginAt).toBeInstanceOf(Date);
    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      role: user.role,
      workshopId: user.workshopId,
    });
  });

  it('should login an existing user already linked to the same Google subject preserving tenant context', async () => {
    const linkedUser = {
      ...user,
      googleSubject: 'google-subject-1',
      googleEmailVerified: true,
      googleLinkedAt: now,
    };

    googleIdentityServiceMock.verifyCredential.mockResolvedValue({
      subject: linkedUser.googleSubject,
      email: linkedUser.email,
      name: linkedUser.name,
      emailVerified: true,
    });
    prismaMock.user.findUnique
      .mockResolvedValueOnce(linkedUser)
      .mockResolvedValueOnce({ ...linkedUser, workshop });
    prismaMock.user.update.mockResolvedValue(linkedUser);

    const result = await service.loginWithGoogle({ credential: 'valid-google-id-token' });

    const loginUpdateCall = prismaMock.user.update.mock.calls[0]?.[0] as {
      where: { id: string };
      data: { lastLoginAt: Date };
    };
    expect(loginUpdateCall.where).toEqual({ id: linkedUser.id });
    expect(loginUpdateCall.data.lastLoginAt).toBeInstanceOf(Date);
    expect(result.user.workshop?.id).toBe(workshop.id);
  });

  it('should attach a workshop to an existing standalone Google admin', async () => {
    const standaloneGoogleUser = {
      ...user,
      workshopId: null,
      googleSubject: 'google-subject-1',
      googleEmailVerified: true,
      googleLinkedAt: now,
    };
    const linkedUserWithWorkshop = {
      ...standaloneGoogleUser,
      workshopId: workshop.id,
    };

    googleIdentityServiceMock.verifyCredential.mockResolvedValue({
      subject: standaloneGoogleUser.googleSubject,
      email: standaloneGoogleUser.email,
      name: standaloneGoogleUser.name,
      emailVerified: true,
    });
    prismaMock.user.findUnique
      .mockResolvedValueOnce(standaloneGoogleUser)
      .mockResolvedValueOnce({ ...linkedUserWithWorkshop, workshop });
    prismaMock.workshop.create.mockResolvedValue(workshop);
    prismaMock.user.update.mockResolvedValue(linkedUserWithWorkshop);

    const result = await service.loginWithGoogle({ credential: 'valid-google-id-token' });

    expect(prismaMock.workshop.create).toHaveBeenCalledWith({
      data: {
        tradeName: standaloneGoogleUser.name,
        cnpj: null,
        isActive: true,
      },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: standaloneGoogleUser.id },
      data: {
        workshopId: workshop.id,
        googleEmailVerified: true,
        lastLoginAt: expect.any(Date),
      },
    });
    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: standaloneGoogleUser.id,
      email: standaloneGoogleUser.email,
      role: standaloneGoogleUser.role,
      workshopId: workshop.id,
    });
    expect(result.user.workshop?.id).toBe(workshop.id);
  });

  it('should prevent Google takeover when existing email is already linked elsewhere', async () => {
    googleIdentityServiceMock.verifyCredential.mockResolvedValue({
      subject: 'new-google-subject',
      email: user.email,
      name: user.name,
      emailVerified: true,
    });
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...user, googleSubject: 'other-google-subject' });

    await expect(
      service.loginWithGoogle({ credential: 'valid-google-id-token' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
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

  it('should keep forgot password response generic when email delivery fails', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user);
    resetTokenServiceMock.create.mockResolvedValue({
      token: 'raw-reset-token',
      expiresAt: now,
    });
    resetEmailServiceMock.sendPasswordReset.mockRejectedValue(new Error('mail unavailable'));

    const result = await service.forgotPassword({ email: 'admin@oficina.com' });

    expect(result).toEqual({
      message: 'Se o e-mail estiver cadastrado, enviaremos instrucoes para redefinir a senha.',
    });
    expect(warnSpy).toHaveBeenCalledWith(
      'Password reset email could not be delivered: mail unavailable',
    );
    expect(JSON.stringify(result)).not.toContain('raw-reset-token');
  });

  it('should reset password when token is valid', async () => {
    resetTokenServiceMock.consumeValidToken.mockResolvedValue(user.id);
    prismaMock.user.update.mockResolvedValue(user);

    await service.resetPassword({
      token: 'valid-reset-token',
      newPassword: 'NewPass123',
      confirmPassword: 'NewPass123',
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
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should still accept legacy reset password payload during transition', async () => {
    resetTokenServiceMock.consumeValidToken.mockResolvedValue(user.id);
    prismaMock.user.update.mockResolvedValue(user);

    await service.resetPassword({
      token: 'valid-reset-token',
      password: 'LegacyPass123',
      passwordConfirmation: 'LegacyPass123',
    });

    const updateCall = prismaMock.user.update.mock.calls[0]?.[0] as {
      data: { passwordHash: string };
    };
    await expect(bcrypt.compare('LegacyPass123', updateCall.data.passwordHash)).resolves.toBe(true);
  });
});
