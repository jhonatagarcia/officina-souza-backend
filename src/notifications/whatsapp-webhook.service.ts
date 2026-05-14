import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Logger } from 'nestjs-pino';
import {
  WhatsAppWebhookPayload,
  WhatsAppWebhookResponse,
  WhatsAppWebhookSummary,
} from 'src/notifications/whatsapp-webhook.types';

@Injectable()
export class WhatsAppWebhookService {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  verifyChallenge(mode?: string, verifyToken?: string, challenge?: string): string {
    const configuredToken = this.configService.get<string>('whatsapp.webhookVerifyToken')?.trim();

    if (!configuredToken) {
      this.logger.warn('WhatsApp webhook verify token is missing');
      throw new ForbiddenException('WhatsApp webhook nao configurado');
    }

    if (mode !== 'subscribe' || verifyToken !== configuredToken || !challenge) {
      this.logger.warn(
        { mode, hasChallenge: Boolean(challenge) },
        'WhatsApp webhook verification rejected',
      );
      throw new ForbiddenException('Falha na verificacao do webhook do WhatsApp');
    }

    return challenge;
  }

  processWebhook(
    payload: WhatsAppWebhookPayload,
    signature?: string,
    rawBody?: Buffer,
  ): WhatsAppWebhookResponse {
    this.verifySignature(signature, rawBody);

    const summary = this.summarizePayload(payload);
    this.logger.log({ summary }, 'WhatsApp webhook received');

    return { received: true, summary };
  }

  private verifySignature(signature?: string, rawBody?: Buffer): void {
    const appSecret = this.configService.get<string>('whatsapp.appSecret')?.trim();

    if (!appSecret) {
      return;
    }

    if (!signature?.startsWith('sha256=') || !rawBody) {
      this.logger.warn(
        { hasSignature: Boolean(signature), hasRawBody: Boolean(rawBody) },
        'WhatsApp webhook signature missing',
      );
      throw new ForbiddenException('Assinatura do webhook do WhatsApp ausente');
    }

    const receivedHash = signature.slice('sha256='.length);
    const expectedHash = createHmac('sha256', appSecret).update(rawBody).digest('hex');

    const receivedBuffer = Buffer.from(receivedHash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      this.logger.warn('WhatsApp webhook signature rejected');
      throw new ForbiddenException('Assinatura do webhook do WhatsApp invalida');
    }
  }

  private summarizePayload(payload: WhatsAppWebhookPayload): WhatsAppWebhookSummary {
    const phoneNumberIds = new Set<string>();
    const messageTypes: Record<string, number> = {};
    const statusTypes: Record<string, number> = {};
    let messageCount = 0;
    let statusCount = 0;

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;

        if (!value) {
          continue;
        }

        if (value.metadata?.phone_number_id) {
          phoneNumberIds.add(value.metadata.phone_number_id);
        }

        for (const message of value.messages ?? []) {
          messageCount += 1;
          const type = message.type?.trim() || 'unknown';
          messageTypes[type] = (messageTypes[type] ?? 0) + 1;
        }

        for (const status of value.statuses ?? []) {
          statusCount += 1;
          const type = status.status?.trim() || 'unknown';
          statusTypes[type] = (statusTypes[type] ?? 0) + 1;
        }
      }
    }

    return {
      object: payload.object ?? null,
      entryCount: payload.entry?.length ?? 0,
      messageCount,
      statusCount,
      phoneNumberIds: [...phoneNumberIds],
      messageTypes,
      statusTypes,
    };
  }
}
