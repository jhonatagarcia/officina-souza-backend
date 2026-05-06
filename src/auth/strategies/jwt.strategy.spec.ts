import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from 'src/common/enums/role.enum';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { UsersService } from 'src/users/users.service';

describe('JwtStrategy', () => {
  const getOrThrowMock = jest.fn((key: string) => {
    const values: Record<string, string> = {
      'auth.jwtSecret': 'test-secret',
      'auth.jwtIssuer': 'oficina-api',
      'auth.jwtAudience': 'oficina-web',
    };

    return values[key];
  });

  const configService = {
    getOrThrow: getOrThrowMock,
  } as unknown as ConfigService;

  const usersService: Pick<UsersService, 'findByEmail'> & {
    findByEmail: jest.MockedFunction<UsersService['findByEmail']>;
  } = {
    findByEmail: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildUser = (overrides: { id: string; email: string; role: Role; isActive: boolean }) => ({
    name: 'User',
    passwordHash: 'hash',
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  it('should reject token when payload subject does not match the persisted user', async () => {
    usersService.findByEmail.mockResolvedValue(
      buildUser({
        id: 'user-2',
        email: 'admin@local.com',
        role: Role.ADMIN,
        isActive: true,
      }),
    );
    const strategy = new JwtStrategy(configService, usersService as unknown as UsersService);

    await expect(
      strategy.validate({
        sub: 'user-1',
        email: 'admin@local.com',
        role: Role.ADMIN,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should configure JWT issuer and audience validation', () => {
    new JwtStrategy(configService, usersService as unknown as UsersService);

    expect(getOrThrowMock).toHaveBeenCalledWith('auth.jwtSecret');
    expect(getOrThrowMock).toHaveBeenCalledWith('auth.jwtIssuer');
    expect(getOrThrowMock).toHaveBeenCalledWith('auth.jwtAudience');
  });

  it('should trust persisted user role instead of the role embedded in the token', async () => {
    usersService.findByEmail.mockResolvedValue(
      buildUser({
        id: 'user-1',
        email: 'mechanic@local.com',
        role: Role.MECANICO,
        isActive: true,
      }),
    );
    const strategy = new JwtStrategy(configService, usersService as unknown as UsersService);

    await expect(
      strategy.validate({
        sub: 'user-1',
        email: 'mechanic@local.com',
        role: Role.ADMIN,
      }),
    ).resolves.toEqual({
      sub: 'user-1',
      email: 'mechanic@local.com',
      role: Role.MECANICO,
    });
  });
});
