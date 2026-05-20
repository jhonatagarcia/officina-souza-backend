import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';
import { formatValidationMessages } from 'src/common/utils/validation-messages.util';

function toOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}

class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV!: 'development' | 'test' | 'production';

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsString()
  @IsNotEmpty()
  APP_NAME!: string;

  @IsString()
  @IsNotEmpty()
  APP_VERSION!: string;

  @IsString()
  @IsNotEmpty()
  API_PREFIX!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN!: string;

  @IsOptional()
  @IsString()
  JWT_ISSUER?: string;

  @IsOptional()
  @IsString()
  JWT_AUDIENCE?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(10)
  @Max(15)
  BCRYPT_SALT_ROUNDS!: number;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN!: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  CORS_CREDENTIALS?: boolean;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  THROTTLE_TTL!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT!: number;

  @IsString()
  @IsNotEmpty()
  LOG_LEVEL!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  QUEUE_PREFIX?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  REDIS_HOST?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  REDIS_USERNAME?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(0)
  REDIS_DB?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  REDIS_TLS?: boolean;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @Max(20)
  QUEUE_WHATSAPP_ATTEMPTS?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(100)
  QUEUE_WHATSAPP_BACKOFF_DELAY_MS?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  WHATSAPP_ACCESS_TOKEN?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  WHATSAPP_PHONE_NUMBER_ID?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  WHATSAPP_API_VERSION?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  WHATSAPP_WEBHOOK_VERIFY_TOKEN?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  META_APP_SECRET?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  WHATSAPP_TEMPLATE_LANGUAGE?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  WHATSAPP_TEMPLATE_HEADER_TEXT?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  WHATSAPP_TEMPLATE_SERVICE_ORDER_IN_PROGRESS?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  WHATSAPP_TEMPLATE_SERVICE_ORDER_FINISHED?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  WHATSAPP_TEMPLATE_SERVICE_ORDER_DELIVERED?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  ENABLE_SWAGGER?: boolean;

  @IsOptional()
  @IsString()
  SEED_ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  SEED_ADMIN_PASSWORD?: string;

  @IsOptional()
  @IsString()
  SEED_ADMIN_NAME?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(5)
  @Max(120)
  PASSWORD_RESET_TOKEN_TTL_MINUTES?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  PASSWORD_RESET_APP_URL?: string;

  @IsOptional()
  @IsIn(['noop', 'webhook'])
  PASSWORD_RESET_EMAIL_PROVIDER?: 'noop' | 'webhook';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  PASSWORD_RESET_EMAIL_FROM?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  PASSWORD_RESET_EMAIL_WEBHOOK_URL?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  PASSWORD_RESET_EMAIL_WEBHOOK_TOKEN?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  CAPTCHA_ENABLED?: boolean;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  CAPTCHA_PROVIDER?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  CAPTCHA_SECRET?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  CAPTCHA_VERIFY_URL?: string;

  @IsOptional()
  @IsIn(['none', 'strict'])
  CAPTCHA_EXPECTED_ACTION?: 'none' | 'strict';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  GOOGLE_CALLBACK_URL?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config);

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Falha na validacao do ambiente: ${formatValidationMessages(errors).join(', ')}`,
    );
  }

  validateSecurityConstraints(validatedConfig);

  return validatedConfig;
}

function validateSecurityConstraints(config: EnvironmentVariables): void {
  const securityErrors: string[] = [];
  const corsOrigins = config.CORS_ORIGIN.split(',').map((origin) => origin.trim());

  if (corsOrigins.some((origin) => !origin)) {
    securityErrors.push('CORS_ORIGIN nao pode conter origens vazias');
  }

  if (corsOrigins.includes('*')) {
    securityErrors.push('CORS_ORIGIN nao pode usar wildcard');
  }

  if (config.NODE_ENV === 'production') {
    const weakJwtSecrets = new Set(['secret', 'changeme', 'change-me', 'jwt-secret']);

    if (config.JWT_SECRET.length < 32 || weakJwtSecrets.has(config.JWT_SECRET.toLowerCase())) {
      securityErrors.push('JWT_SECRET deve ter pelo menos 32 caracteres em producao');
    }

    if (!config.JWT_ISSUER?.trim()) {
      securityErrors.push('JWT_ISSUER deve ser definido em producao');
    }

    if (!config.JWT_AUDIENCE?.trim()) {
      securityErrors.push('JWT_AUDIENCE deve ser definido em producao');
    }

    if (config.ENABLE_SWAGGER === true) {
      securityErrors.push('ENABLE_SWAGGER nao pode ser true em producao');
    }

    if (!config.PASSWORD_RESET_APP_URL?.trim()) {
      securityErrors.push('PASSWORD_RESET_APP_URL deve ser definido em producao');
    }

    if (!config.PASSWORD_RESET_EMAIL_PROVIDER || config.PASSWORD_RESET_EMAIL_PROVIDER === 'noop') {
      securityErrors.push('PASSWORD_RESET_EMAIL_PROVIDER deve ser configurado em producao');
    }

    if (config.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() && !config.META_APP_SECRET?.trim()) {
      securityErrors.push(
        'META_APP_SECRET deve ser definido em producao quando webhook do WhatsApp estiver ativo',
      );
    }

    if (!config.GOOGLE_CLIENT_ID?.trim()) {
      securityErrors.push('GOOGLE_CLIENT_ID deve ser definido em producao');
    }
  }

  if (config.CAPTCHA_ENABLED === true && (!config.CAPTCHA_SECRET || !config.CAPTCHA_VERIFY_URL)) {
    securityErrors.push(
      'CAPTCHA_SECRET e CAPTCHA_VERIFY_URL devem ser definidos quando CAPTCHA_ENABLED=true',
    );
  }

  if (
    config.PASSWORD_RESET_EMAIL_PROVIDER === 'webhook' &&
    !config.PASSWORD_RESET_EMAIL_WEBHOOK_URL?.trim()
  ) {
    securityErrors.push(
      'PASSWORD_RESET_EMAIL_WEBHOOK_URL deve ser definido quando PASSWORD_RESET_EMAIL_PROVIDER=webhook',
    );
  }

  if (securityErrors.length > 0) {
    throw new Error(`Falha na validacao de seguranca do ambiente: ${securityErrors.join(', ')}`);
  }
}
