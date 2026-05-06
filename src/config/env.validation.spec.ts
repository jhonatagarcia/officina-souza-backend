import 'reflect-metadata';
import { validateEnv } from 'src/config/env.validation';

describe('validateEnv security constraints', () => {
  const baseConfig = {
    NODE_ENV: 'production',
    PORT: '3000',
    APP_NAME: 'Oficina API',
    APP_VERSION: '1.0.0',
    API_PREFIX: 'api',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/oficina',
    JWT_SECRET: 'a'.repeat(32),
    JWT_EXPIRES_IN: '15m',
    JWT_ISSUER: 'oficina-api',
    JWT_AUDIENCE: 'oficina-web',
    BCRYPT_SALT_ROUNDS: '12',
    CORS_ORIGIN: 'https://app.example.com',
    CORS_CREDENTIALS: 'false',
    THROTTLE_TTL: '60',
    THROTTLE_LIMIT: '100',
    LOG_LEVEL: 'info',
  };

  it('should reject weak JWT secrets in production', () => {
    expect(() =>
      validateEnv({
        ...baseConfig,
        JWT_SECRET: 'secret',
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it('should reject wildcard CORS origin because the API enables credentials', () => {
    expect(() =>
      validateEnv({
        ...baseConfig,
        CORS_ORIGIN: '*',
      }),
    ).toThrow(/CORS_ORIGIN/);
  });

  it('should require JWT issuer and audience in production', () => {
    expect(() =>
      validateEnv({
        ...baseConfig,
        JWT_ISSUER: '',
      }),
    ).toThrow(/JWT_ISSUER/);

    expect(() =>
      validateEnv({
        ...baseConfig,
        JWT_AUDIENCE: '',
      }),
    ).toThrow(/JWT_AUDIENCE/);
  });

  it('should reject Swagger enabled in production', () => {
    expect(() =>
      validateEnv({
        ...baseConfig,
        ENABLE_SWAGGER: 'true',
      }),
    ).toThrow(/ENABLE_SWAGGER/);
  });

  it('should accept strong production security configuration', () => {
    expect(validateEnv(baseConfig).JWT_SECRET).toBe(baseConfig.JWT_SECRET);
  });
});
