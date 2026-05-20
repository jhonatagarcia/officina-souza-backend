import { validate } from 'class-validator';
import { ResetPasswordDto } from 'src/auth/dto/reset-password.dto';

describe('ResetPasswordDto', () => {
  function buildDto(overrides: Partial<ResetPasswordDto> = {}) {
    const dto = new ResetPasswordDto();
    dto.token = 'a'.repeat(43);
    dto.newPassword = 'NewPass123';
    dto.confirmPassword = 'NewPass123';
    Object.assign(dto, overrides);
    return dto;
  }

  it('should accept the public reset password contract', async () => {
    await expect(validate(buildDto())).resolves.toHaveLength(0);
  });

  it('should accept legacy password fields during transition', async () => {
    const dto = buildDto({
      newPassword: undefined,
      confirmPassword: undefined,
      password: 'LegacyPass123',
      passwordConfirmation: 'LegacyPass123',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('should reject password confirmation mismatch', async () => {
    const errors = await validate(buildDto({ confirmPassword: 'OtherPass123' }));

    expect(errors.map((error) => error.property)).toContain('confirmPassword');
  });

  it('should reject weak new password', async () => {
    const errors = await validate(
      buildDto({ newPassword: 'password', confirmPassword: 'password' }),
    );

    expect(errors.map((error) => error.property)).toContain('newPassword');
  });

  it('should reject short token', async () => {
    const errors = await validate(buildDto({ token: 'short-token' }));

    expect(errors.map((error) => error.property)).toContain('token');
  });
});
