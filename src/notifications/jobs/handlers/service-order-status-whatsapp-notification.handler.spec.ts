import { ConfigService } from '@nestjs/config';
import { ServiceOrderStatus } from '@prisma/client';
import { Logger } from 'nestjs-pino';
import { RetryableNotificationJobError } from 'src/notifications/jobs/notification-job.errors';
import { ServiceOrderStatusWhatsAppNotificationHandler } from 'src/notifications/jobs/handlers/service-order-status-whatsapp-notification.handler';
import { ServiceOrderStatusChangedWhatsAppJob } from 'src/notifications/jobs/whatsapp-notification.jobs';
import { ServiceOrderWhatsAppMessageService } from 'src/notifications/services/service-order-whatsapp-message.service';
import { WhatsAppIntegrationSettingsService } from 'src/notifications/services/whatsapp-integration-settings.service';
import { WhatsAppCloudApiService } from 'src/notifications/whatsapp-cloud-api.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ServiceOrderStatusWhatsAppNotificationHandler', () => {
  const values: Record<string, string | undefined> = {
    'whatsapp.accessToken': 'token',
    'whatsapp.phoneNumberId': 'phone-number-id',
    'whatsapp.templateLanguage': 'pt_BR',
    'whatsapp.templateHeaderText': 'Oficina Paiva',
    'whatsapp.templates.serviceOrderInProgress': 'ordem_em_andamento',
    'whatsapp.templates.serviceOrderFinished': 'ordem_finalizada',
    'whatsapp.templates.serviceOrderDelivered': 'ordem_entregue',
  };
  const configServiceMock = {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
  const findUniqueMock = jest.fn();
  const prismaMock = {
    serviceOrder: {
      findUnique: findUniqueMock,
    },
  } as unknown as PrismaService;
  const sendTemplateMessageMock = jest.fn();
  const whatsAppCloudApiServiceMock = {
    sendTemplateMessage: sendTemplateMessageMock,
  } as unknown as WhatsAppCloudApiService;
  const loggerWarnMock = jest.fn();
  const loggerMock = {
    log: jest.fn(),
    warn: loggerWarnMock,
    error: jest.fn(),
  } as unknown as Logger;

  function buildHandler() {
    const messageService = new ServiceOrderWhatsAppMessageService(configServiceMock);
    const integrationSettings = new WhatsAppIntegrationSettingsService(configServiceMock);

    return new ServiceOrderStatusWhatsAppNotificationHandler(
      prismaMock,
      messageService,
      whatsAppCloudApiServiceMock,
      integrationSettings,
      loggerMock,
    );
  }

  function buildJob(
    overrides: Partial<ServiceOrderStatusChangedWhatsAppJob> = {},
  ): ServiceOrderStatusChangedWhatsAppJob {
    return {
      eventId: 'event-1',
      workshopId: null,
      serviceOrderId: 'os-1',
      previousStatus: ServiceOrderStatus.ABERTA,
      currentStatus: ServiceOrderStatus.EM_ANDAMENTO,
      occurredAt: '2030-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    values['whatsapp.accessToken'] = 'token';
    values['whatsapp.phoneNumberId'] = 'phone-number-id';
    values['whatsapp.templateLanguage'] = 'pt_BR';
    values['whatsapp.templateHeaderText'] = 'Oficina Paiva';
    values['whatsapp.templates.serviceOrderInProgress'] = 'ordem_em_andamento';
    values['whatsapp.templates.serviceOrderFinished'] = 'ordem_finalizada';
    values['whatsapp.templates.serviceOrderDelivered'] = 'ordem_entregue';
    findUniqueMock.mockResolvedValue({
      id: 'os-1',
      client: { id: 'client-1', name: 'Maria Silva', phone: '+55 (11) 98765-4321' },
    });
    sendTemplateMessageMock.mockResolvedValue({ success: true });
  });

  it('should send WhatsApp template message for a valid service order status job', async () => {
    const result = await buildHandler().handle(buildJob());

    expect(result).toEqual({ status: 'SENT' });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 'os-1' },
      include: { client: true },
    });
    expect(sendTemplateMessageMock).toHaveBeenCalledWith({
      to: '5511987654321',
      templateName: 'ordem_em_andamento',
      languageCode: 'pt_BR',
      headerParameters: ['Oficina Paiva'],
      bodyParameters: ['Maria Silva'],
    });
  });

  it('should skip sending when WhatsApp integration is inactive for the workshop', async () => {
    values['whatsapp.accessToken'] = undefined;

    const result = await buildHandler().handle(buildJob({ workshopId: 'workshop-1' }));

    expect(result).toEqual({ status: 'SKIPPED', reason: 'CONFIGURATION_MISSING' });
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(sendTemplateMessageMock).not.toHaveBeenCalled();
  });

  it('should not send when tenant scope is required but unavailable on the persisted service order', async () => {
    const result = await buildHandler().handle(buildJob({ workshopId: 'workshop-1' }));

    expect(result).toEqual({ status: 'SKIPPED', reason: 'TENANT_SCOPE_UNSUPPORTED' });
    expect(sendTemplateMessageMock).not.toHaveBeenCalled();
    expect(loggerWarnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'event-1',
        serviceOrderId: 'os-1',
        workshopId: 'workshop-1',
        hasPersistedWorkshopScope: false,
      }),
      'WhatsApp notification skipped because tenant scope did not match',
    );
  });

  it('should return non-retryable failure when client phone is invalid', async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: 'os-1',
      client: { id: 'client-1', name: 'Maria Silva', phone: '123' },
    });

    const result = await buildHandler().handle(buildJob());

    expect(result).toEqual({ status: 'FAILED', reason: 'CLIENT_PHONE_INVALID' });
    expect(sendTemplateMessageMock).not.toHaveBeenCalled();
  });

  it('should throw retryable error when WhatsApp provider failure is transient', async () => {
    sendTemplateMessageMock.mockResolvedValueOnce({
      success: false,
      errorCode: 'HTTP_503',
      providerStatusCode: 503,
    });

    await expect(buildHandler().handle(buildJob())).rejects.toBeInstanceOf(
      RetryableNotificationJobError,
    );
    expect(loggerWarnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'HTTP_503',
        providerStatusCode: 503,
      }),
      'Retryable WhatsApp notification failure',
    );
  });

  it('should not retry non-transient WhatsApp provider failures', async () => {
    sendTemplateMessageMock.mockResolvedValueOnce({
      success: false,
      errorCode: '131026',
      errorDetails: 'Recipient cannot receive this message',
      providerStatusCode: 400,
      fbTraceId: 'trace-1',
    });

    const result = await buildHandler().handle(buildJob());

    expect(result).toEqual({
      status: 'FAILED',
      reason: '131026',
      details: 'Recipient cannot receive this message',
      providerStatusCode: 400,
      fbTraceId: 'trace-1',
    });
    expect(loggerWarnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: '131026',
        providerStatusCode: 400,
        fbTraceId: 'trace-1',
      }),
      'Non-retryable WhatsApp notification failure',
    );
  });
});
