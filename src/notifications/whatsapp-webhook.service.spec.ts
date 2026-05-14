import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHmac } from 'crypto';
import { Logger } from 'nestjs-pino';
import { WhatsAppWebhookService } from 'src/notifications/whatsapp-webhook.service';

describe('WhatsAppWebhookService', () => {
  let service: WhatsAppWebhookService;
  const loggerMock = {
    log: jest.fn(),
    warn: jest.fn(),
  };
  const values: Record<string, string | undefined> = {
    'whatsapp.webhookVerifyToken': 'verify-token',
    'whatsapp.appSecret': undefined,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    values['whatsapp.webhookVerifyToken'] = 'verify-token';
    values['whatsapp.appSecret'] = undefined;

    const moduleRef = await Test.createTestingModule({
      providers: [
        WhatsAppWebhookService,
        { provide: ConfigService, useValue: { get: jest.fn((key: string) => values[key]) } },
        { provide: Logger, useValue: loggerMock },
      ],
    }).compile();

    service = moduleRef.get(WhatsAppWebhookService);
  });

  it('should return hub challenge when verification token matches', () => {
    expect(service.verifyChallenge('subscribe', 'verify-token', 'challenge-123')).toBe(
      'challenge-123',
    );
  });

  it('should reject webhook verification when token does not match', () => {
    expect(() => service.verifyChallenge('subscribe', 'wrong-token', 'challenge-123')).toThrow(
      ForbiddenException,
    );
  });

  it('should summarize received messages and status updates', () => {
    const result = service.processWebhook({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: '123456' },
                messages: [{ id: 'wamid-1', from: '5511999999999', type: 'text' }],
                statuses: [{ id: 'wamid-2', status: 'delivered' }],
              },
            },
          ],
        },
      ],
    });

    expect(result.summary).toEqual({
      object: 'whatsapp_business_account',
      entryCount: 1,
      messageCount: 1,
      statusCount: 1,
      phoneNumberIds: ['123456'],
      messageTypes: { text: 1 },
      statusTypes: { delivered: 1 },
    });
    expect(loggerMock.log).toHaveBeenCalled();
  });

  it('should reject invalid signatures when app secret is configured', () => {
    values['whatsapp.appSecret'] = 'app-secret';

    expect(() =>
      service.processWebhook({ object: 'whatsapp_business_account' }, 'sha256=bad'),
    ).toThrow(ForbiddenException);
  });

  it('should accept valid signatures when app secret is configured', () => {
    values['whatsapp.appSecret'] = 'app-secret';
    const rawBody = Buffer.from('{"object":"whatsapp_business_account"}');
    const signature = `sha256=${createHmac('sha256', 'app-secret').update(rawBody).digest('hex')}`;

    const result = service.processWebhook(
      { object: 'whatsapp_business_account' },
      signature,
      rawBody,
    );

    expect(result.received).toBe(true);
  });
});
