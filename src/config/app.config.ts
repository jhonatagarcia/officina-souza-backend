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
  queue: {
    prefix: process.env.QUEUE_PREFIX ?? 'oficina',
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      db: Number(process.env.REDIS_DB ?? 0),
      tls: process.env.REDIS_TLS === 'true',
    },
    notifications: {
      whatsapp: {
        attempts: Number(process.env.QUEUE_WHATSAPP_ATTEMPTS ?? 5),
        backoffDelayMs: Number(process.env.QUEUE_WHATSAPP_BACKOFF_DELAY_MS ?? 5000),
      },
    },
  },
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    apiVersion: process.env.WHATSAPP_API_VERSION ?? 'v21.0',
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    appSecret: process.env.META_APP_SECRET,
    templateHeaderText: process.env.WHATSAPP_TEMPLATE_HEADER_TEXT,
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'pt_BR',
    templates: {
      serviceOrderInProgress: process.env.WHATSAPP_TEMPLATE_SERVICE_ORDER_IN_PROGRESS,
      serviceOrderFinished: process.env.WHATSAPP_TEMPLATE_SERVICE_ORDER_FINISHED,
      serviceOrderDelivered: process.env.WHATSAPP_TEMPLATE_SERVICE_ORDER_DELIVERED,
    },
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
