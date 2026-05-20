import { validate } from 'class-validator';
import { RegisterDto } from 'src/auth/dto/register.dto';

describe('RegisterDto', () => {
  function buildDto(overrides: Partial<RegisterDto> = {}) {
    const dto = new RegisterDto();
    dto.tradeName = 'Oficina Paiva';
    dto.email = 'admin@oficina.com';
    dto.password = 'Admin123';
    dto.passwordConfirmation = 'Admin123';
    Object.assign(dto, overrides);
    return dto;
  }

  it('should accept valid registration payload with optional CNPJ', async () => {
    await expect(validate(buildDto())).resolves.toHaveLength(0);
  });

  it('should accept confirmPassword as an alias for passwordConfirmation', async () => {
    const dto = buildDto({ passwordConfirmation: undefined, confirmPassword: 'Admin123' });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('should accept passwords with symbols, spaces and unicode letters when policy is met', async () => {
    await expect(
      validate(buildDto({ password: 'Ádmín 123!@#', passwordConfirmation: 'Ádmín 123!@#' })),
    ).resolves.toHaveLength(0);
  });

  it('should reject weak password', async () => {
    const errors = await validate(
      buildDto({ password: 'password', passwordConfirmation: 'password' }),
    );

    expect(errors.map((error) => error.property)).toContain('password');
  });

  it('should reject passwords shorter than 8 characters', async () => {
    const errors = await validate(buildDto({ password: 'Adm123', passwordConfirmation: 'Adm123' }));

    expect(errors.map((error) => error.property)).toContain('password');
  });

  it('should reject password confirmation mismatch', async () => {
    const errors = await validate(buildDto({ passwordConfirmation: 'Other123' }));

    expect(errors.map((error) => error.property)).toContain('passwordConfirmation');
  });
});
