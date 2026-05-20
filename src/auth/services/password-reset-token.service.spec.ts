/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { ConfigService } from '@nestjs/config';
import { PasswordResetTokenService } from 'src/auth/services/password-reset-token.service';

describe('PasswordResetTokenService', () => {
  const now = new Date('2026-05-15T12:00:00.000Z');
  const prismaMock = {
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const configServiceMock = {
    get: jest.fn((key: string) => (key === 'passwordReset.tokenTtlMinutes' ? 30 : undefined)),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now.getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should persist only token hash when creating reset token', async () => {
    const service = new PasswordResetTokenService(prismaMock as never, configServiceMock);

    const result = await service.create('user-1');

    expect(result.token).toHaveLength(43);
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: new Date('2026-05-15T12:30:00.000Z'),
      },
    });
    expect(prismaMock.passwordResetToken.create.mock.calls[0]?.[0].data.tokenHash).not.toBe(
      result.token,
    );
  });

  it('should consume valid token once', async () => {
    const service = new PasswordResetTokenService(prismaMock as never, configServiceMock);
    const result = await service.create('user-1');
    const tokenHash = prismaMock.passwordResetToken.create.mock.calls[0]?.[0].data.tokenHash;
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash,
      expiresAt: new Date('2026-05-15T12:30:00.000Z'),
      usedAt: null,
      revokedAt: null,
      createdAt: now,
    });
    prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.consumeValidToken(result.token)).resolves.toBe('user-1');
  });

  it('should reject expired token', async () => {
    const service = new PasswordResetTokenService(prismaMock as never, configServiceMock);
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: '00',
      expiresAt: new Date('2026-05-15T11:59:00.000Z'),
      usedAt: null,
      revokedAt: null,
      createdAt: now,
    });

    await expect(service.consumeValidToken('expired-token')).resolves.toBeNull();
  });

  it('should reject already used token', async () => {
    const service = new PasswordResetTokenService(prismaMock as never, configServiceMock);
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: '00',
      expiresAt: new Date('2026-05-15T12:30:00.000Z'),
      usedAt: now,
      revokedAt: null,
      createdAt: now,
    });

    await expect(service.consumeValidToken('used-token')).resolves.toBeNull();
  });

  it('should reject revoked token', async () => {
    const service = new PasswordResetTokenService(prismaMock as never, configServiceMock);
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: '00',
      expiresAt: new Date('2026-05-15T12:30:00.000Z'),
      usedAt: null,
      revokedAt: now,
      createdAt: now,
    });

    await expect(service.consumeValidToken('revoked-token')).resolves.toBeNull();
  });

  it('should return null when token was already consumed concurrently', async () => {
    const service = new PasswordResetTokenService(prismaMock as never, configServiceMock);
    const result = await service.create('user-1');
    const tokenHash = prismaMock.passwordResetToken.create.mock.calls[0]?.[0].data.tokenHash;
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash,
      expiresAt: new Date('2026-05-15T12:30:00.000Z'),
      usedAt: null,
      revokedAt: null,
      createdAt: now,
    });
    prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.consumeValidToken(result.token)).resolves.toBeNull();
  });

  it('should revoke all active tokens for a user after password reset', async () => {
    const service = new PasswordResetTokenService(prismaMock as never, configServiceMock);

    await service.revokeActiveTokensForUser('user-1');

    expect(prismaMock.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now },
    });
  });

  it('should revoke active old tokens before creating a new one', async () => {
    const service = new PasswordResetTokenService(prismaMock as never, configServiceMock);

    await service.create('user-1');

    expect(prismaMock.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now },
    });
  });
});
