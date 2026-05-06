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
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

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
  }

  if (securityErrors.length > 0) {
    throw new Error(`Falha na validacao de seguranca do ambiente: ${securityErrors.join(', ')}`);
  }
}
