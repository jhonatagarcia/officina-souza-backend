import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface PasswordResetEmailInput {
  email: string;
  token: string;
  expiresAt: Date;
}

interface EmailPayload {
  to: string;
  from?: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class PasswordResetEmailService {
  private readonly logger = new Logger(PasswordResetEmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendPasswordReset(input: PasswordResetEmailInput): Promise<void> {
    const resetUrl = this.buildResetUrl(input.token);
    const expiresInMinutes = this.configService.get<number>('passwordReset.tokenTtlMinutes') ?? 30;

    await this.deliver({
      to: input.email,
      from: this.configService.get<string>('passwordReset.emailFrom'),
      subject: 'Redefinicao de senha',
      text: this.buildTextTemplate(resetUrl, expiresInMinutes),
      html: this.buildHtmlTemplate(resetUrl, expiresInMinutes),
    });
  }

  private buildResetUrl(token: string): string {
    const baseUrl = this.configService.get<string>('passwordReset.appUrl');
    if (!baseUrl) return token;

    const url = new URL(baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private buildTextTemplate(resetUrl: string, expiresInMinutes: number): string {
    return [
      'Recebemos uma solicitacao para redefinir a senha da sua conta.',
      '',
      `Use o link abaixo para criar uma nova senha. Ele expira em ${expiresInMinutes} minutos:`,
      resetUrl,
      '',
      'Se voce nao solicitou essa alteracao, ignore este e-mail. Sua senha atual permanece valida.',
    ].join('\n');
  }

  private buildHtmlTemplate(resetUrl: string, expiresInMinutes: number): string {
    const safeResetUrl = this.escapeHtml(resetUrl);

    return [
      '<p>Recebemos uma solicitacao para redefinir a senha da sua conta.</p>',
      `<p>Use o link abaixo para criar uma nova senha. Ele expira em ${expiresInMinutes} minutos.</p>`,
      `<p><a href="${safeResetUrl}">Redefinir senha</a></p>`,
      '<p>Se voce nao solicitou essa alteracao, ignore este e-mail. Sua senha atual permanece valida.</p>',
    ].join('');
  }

  private async deliver(payload: EmailPayload): Promise<void> {
    const provider = this.configService.get<string>('passwordReset.emailProvider') ?? 'noop';

    if (provider === 'noop') {
      this.logger.warn('Password reset email provider is not configured; email was not delivered');
      return;
    }

    if (provider !== 'webhook') {
      throw new ServiceUnavailableException('Provider de e-mail indisponivel');
    }

    await this.deliverWithWebhook(payload);
  }

  private async deliverWithWebhook(payload: EmailPayload): Promise<void> {
    const webhookUrl = this.configService.get<string>('passwordReset.emailWebhookUrl');
    if (!webhookUrl) {
      throw new ServiceUnavailableException('Provider de e-mail indisponivel');
    }

    const authToken = this.configService.get<string>('passwordReset.emailWebhookToken');
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException('Falha ao enviar e-mail de redefinicao');
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
