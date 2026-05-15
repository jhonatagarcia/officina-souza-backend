import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface PasswordResetEmailInput {
  email: string;
  token: string;
  expiresAt: Date;
}

@Injectable()
export class PasswordResetEmailService {
  private readonly logger = new Logger(PasswordResetEmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendPasswordReset(input: PasswordResetEmailInput): Promise<void> {
    const resetUrl = this.buildResetUrl(input.token);

    await this.deliver({
      to: input.email,
      subject: 'Redefinicao de senha',
      resetUrl,
      expiresAt: input.expiresAt,
    });
  }

  private buildResetUrl(token: string): string {
    const baseUrl = this.configService.get<string>('passwordReset.appUrl');
    if (!baseUrl) return token;

    const url = new URL(baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private async deliver(input: {
    to: string;
    subject: string;
    resetUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    void input;
    this.logger.warn(
      'Password reset email delivery provider is not configured; reset token was generated but not delivered',
    );
  }
}
