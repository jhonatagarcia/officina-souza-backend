import { BadRequestException } from '@nestjs/common';
import { CaptchaService } from 'src/auth/services/captcha.service';

describe('CaptchaService', () => {
  const configServiceMock = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('should skip captcha verification when disabled', async () => {
    configServiceMock.get.mockReturnValue(false);
    const service = new CaptchaService(configServiceMock as never);

    await expect(service.verify(undefined, 'login')).resolves.toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should require captcha token when enabled', async () => {
    configServiceMock.get.mockImplementation((key: string) => key === 'captcha.enabled');
    const service = new CaptchaService(configServiceMock as never);

    await expect(service.verify(undefined, 'login')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject invalid captcha provider response', async () => {
    configServiceMock.get.mockImplementation((key: string) => {
      const values: Record<string, unknown> = {
        'captcha.enabled': true,
        'captcha.secret': 'secret',
        'captcha.verifyUrl': 'https://captcha.local/verify',
        'captcha.expectedAction': 'none',
      };
      return values[key];
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: false }),
    });
    const service = new CaptchaService(configServiceMock as never);

    await expect(service.verify('captcha-token', 'login')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
