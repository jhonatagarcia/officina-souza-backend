import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordResetEmailService } from 'src/auth/services/password-reset-email.service';

describe('PasswordResetEmailService', () => {
  const expiresAt = new Date('2026-05-15T12:30:00.000Z');
  const config = new Map<string, unknown>([
    ['passwordReset.tokenTtlMinutes', 30],
    ['passwordReset.appUrl', 'http://localhost:5173/reset-password'],
    ['passwordReset.emailProvider', 'webhook'],
    ['passwordReset.emailFrom', 'no-reply@oficina.local'],
    ['passwordReset.emailWebhookUrl', 'https://mail.example.test/send'],
    ['passwordReset.emailWebhookToken', 'secret-token'],
  ]);
  const configServiceMock = {
    get: jest.fn((key: string) => config.get(key)),
  } as unknown as ConfigService;
  const fetchMock = jest.fn();
  const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as never;
    fetchMock.mockResolvedValue({ ok: true });
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it('should send password reset email through configured webhook', async () => {
    const service = new PasswordResetEmailService(configServiceMock);

    await service.sendPasswordReset({
      email: 'admin@oficina.com',
      token: 'raw-reset-token',
      expiresAt,
    });

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('https://mail.example.test/send');
    expect(request).toMatchObject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer secret-token',
      },
    });

    const body = JSON.parse(request.body as string) as {
      to: string;
      from: string;
      subject: string;
      text: string;
      html: string;
    };
    expect(body.to).toBe('admin@oficina.com');
    expect(body.from).toBe('no-reply@oficina.local');
    expect(body.subject).toBe('Redefinicao de senha');
    expect(body.text).toContain('expira em 30 minutos');
    expect(body.text).toContain('token=raw-reset-token');
    expect(body.html).toContain('Redefinir senha');
  });

  it('should not log or deliver token when provider is noop', async () => {
    config.set('passwordReset.emailProvider', 'noop');
    const service = new PasswordResetEmailService(configServiceMock);

    await service.sendPasswordReset({
      email: 'admin@oficina.com',
      token: 'raw-reset-token',
      expiresAt,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'Password reset email provider is not configured; email was not delivered',
    );
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain('raw-reset-token');
    config.set('passwordReset.emailProvider', 'webhook');
  });

  it('should fail safely when webhook provider is unavailable', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    const service = new PasswordResetEmailService(configServiceMock);

    await expect(
      service.sendPasswordReset({
        email: 'admin@oficina.com',
        token: 'raw-reset-token',
        expiresAt,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
