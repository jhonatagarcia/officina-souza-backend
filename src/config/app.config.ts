export default () => ({
  nodeEnv: process.env.NODE_ENV,
  app: {
    name: process.env.APP_NAME,
    version: process.env.APP_VERSION,
    port: Number(process.env.PORT),
    apiPrefix: process.env.API_PREFIX,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN,
    jwtIssuer: process.env.JWT_ISSUER ?? process.env.APP_NAME,
    jwtAudience: process.env.JWT_AUDIENCE ?? process.env.API_PREFIX,
    bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS),
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()),
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
  throttle: {
    ttl: Number(process.env.THROTTLE_TTL),
    limit: Number(process.env.THROTTLE_LIMIT),
  },
  logging: {
    level: process.env.LOG_LEVEL,
  },
  swagger: {
    enabled:
      process.env.ENABLE_SWAGGER !== undefined
        ? process.env.ENABLE_SWAGGER === 'true'
        : process.env.NODE_ENV !== 'production',
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL,
    adminPassword: process.env.SEED_ADMIN_PASSWORD,
    adminName: process.env.SEED_ADMIN_NAME,
  },
});
