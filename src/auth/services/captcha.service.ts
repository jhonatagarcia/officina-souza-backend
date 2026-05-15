import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type CaptchaAction = 'login' | 'register' | 'forgot-password' | 'reset-password';

interface CaptchaVerifyResponse {
  success?: boolean;
  score?: number;
  action?: string;
  ['error-codes']?: string[];
}

@Injectable()
export class CaptchaService {
  constructor(private readonly configService: ConfigService) {}

  async verify(token: string | undefined, action: CaptchaAction): Promise<void> {
    if (!this.configService.get<boolean>('captcha.enabled')) return;

    if (!token?.trim()) {
      throw new BadRequestException('Captcha obrigatorio');
    }

    const secret = this.configService.get<string>('captcha.secret');
    const verifyUrl = this.configService.get<string>('captcha.verifyUrl');

    if (!secret || !verifyUrl) {
      throw new ServiceUnavailableException('Captcha indisponivel');
    }

    const body = new URLSearchParams({
      secret,
      response: token,
    });

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      throw new ServiceUnavailableException('Captcha indisponivel');
    }

    const result = (await response.json()) as CaptchaVerifyResponse;

    if (result.success !== true) {
      throw new BadRequestException('Captcha invalido');
    }

    const expectedAction = this.configService.get<string>('captcha.expectedAction');
    if (expectedAction === 'strict' && result.action && result.action !== action) {
      throw new BadRequestException('Captcha invalido');
    }
  }
}
