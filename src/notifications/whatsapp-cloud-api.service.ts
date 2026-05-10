import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';

export interface WhatsAppTextMessageInput {
  to: string;
  message: string;
}

export interface WhatsAppTemplateMessageInput {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParameters?: string[];
}

export interface WhatsAppSendResult {
  success: boolean;
  errorCode?: string;
}

interface WhatsAppApiErrorResponse {
  error?: {
    code?: number | string;
    type?: string;
  };
}

@Injectable()
export class WhatsAppCloudApiService {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  async sendTextMessage(input: WhatsAppTextMessageInput): Promise<WhatsAppSendResult> {
    const accessToken = this.configService.get<string>('whatsapp.accessToken')?.trim();
    const phoneNumberId = this.configService.get<string>('whatsapp.phoneNumberId')?.trim();
    const apiVersion = this.configService.get<string>('whatsapp.apiVersion')?.trim() || 'v21.0';

    if (!accessToken || !phoneNumberId) {
      this.logger.warn('WhatsApp Cloud API configuration is missing');
      return { success: false, errorCode: 'CONFIGURATION_MISSING' };
    }

    if (!input.to.trim() || !input.message.trim()) {
      this.logger.warn(
        'WhatsApp message rejected before send because recipient or message is empty',
      );
      return { success: false, errorCode: 'INVALID_MESSAGE' };
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: input.to,
          type: 'text',
          text: {
            preview_url: false,
            body: input.message,
          },
        }),
      });

      if (response.ok) {
        return { success: true };
      }

      const errorCode = await this.resolveSafeErrorCode(response);
      this.logger.warn(
        { statusCode: response.status, errorCode },
        'WhatsApp Cloud API rejected message',
      );

      return { success: false, errorCode };
    } catch (error) {
      this.logger.warn(
        { error: this.getSafeErrorName(error) },
        'WhatsApp Cloud API request failed',
      );
      return { success: false, errorCode: 'REQUEST_FAILED' };
    }
  }

  async sendTemplateMessage(input: WhatsAppTemplateMessageInput): Promise<WhatsAppSendResult> {
    const accessToken = this.configService.get<string>('whatsapp.accessToken')?.trim();
    const phoneNumberId = this.configService.get<string>('whatsapp.phoneNumberId')?.trim();
    const apiVersion = this.configService.get<string>('whatsapp.apiVersion')?.trim() || 'v21.0';

    if (!accessToken || !phoneNumberId) {
      this.logger.warn('WhatsApp Cloud API configuration is missing');
      return { success: false, errorCode: 'CONFIGURATION_MISSING' };
    }

    if (!input.to.trim() || !input.templateName.trim() || !input.languageCode.trim()) {
      this.logger.warn(
        'WhatsApp template rejected before send because recipient, template or language is empty',
      );
      return { success: false, errorCode: 'INVALID_TEMPLATE_MESSAGE' };
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: input.to,
          type: 'template',
          template: {
            name: input.templateName,
            language: {
              code: input.languageCode,
            },
            ...(input.bodyParameters?.length
              ? {
                  components: [
                    {
                      type: 'body',
                      parameters: input.bodyParameters.map((parameter) => ({
                        type: 'text',
                        text: parameter,
                      })),
                    },
                  ],
                }
              : {}),
          },
        }),
      });

      if (response.ok) {
        return { success: true };
      }

      const errorCode = await this.resolveSafeErrorCode(response);
      this.logger.warn(
        { statusCode: response.status, errorCode },
        'WhatsApp Cloud API rejected template message',
      );

      return { success: false, errorCode };
    } catch (error) {
      this.logger.warn(
        { error: this.getSafeErrorName(error) },
        'WhatsApp Cloud API template request failed',
      );
      return { success: false, errorCode: 'REQUEST_FAILED' };
    }
  }

  private async resolveSafeErrorCode(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as WhatsAppApiErrorResponse;
      const code = body.error?.code ?? body.error?.type;

      return code ? String(code) : `HTTP_${response.status}`;
    } catch {
      return `HTTP_${response.status}`;
    }
  }

  private getSafeErrorName(error: unknown): string {
    return error instanceof Error ? error.name : 'UnknownError';
  }
}
