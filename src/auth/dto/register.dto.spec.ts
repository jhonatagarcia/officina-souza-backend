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

  it('should reject weak password', async () => {
    const errors = await validate(
      buildDto({ password: 'password', passwordConfirmation: 'password' }),
    );

    expect(errors.map((error) => error.property)).toContain('password');
  });

  it('should reject password confirmation mismatch', async () => {
    const errors = await validate(buildDto({ passwordConfirmation: 'Other123' }));

    expect(errors.map((error) => error.property)).toContain('passwordConfirmation');
  });
});
