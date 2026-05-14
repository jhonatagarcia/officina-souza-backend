export function getEnvFilePath(): string[] {
  const explicitEnvFile = process.env.ENV_FILE?.trim();

  if (explicitEnvFile) {
    return [explicitEnvFile];
  }

  return process.env.NODE_ENV === 'production' ? ['.env.prod'] : ['.env'];
}
