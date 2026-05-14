import { Job } from 'bullmq';
import { Logger } from 'nestjs-pino';
import { QUEUE_NAMES } from 'src/queue/queue.constants';
import { ServiceOrderStatusWhatsAppNotificationHandler } from 'src/notifications/jobs/handlers/service-order-status-whatsapp-notification.handler';
import { WhatsAppNotificationsProcessor } from 'src/notifications/jobs/whatsapp-notifications.processor';
import {
  ServiceOrderStatusChangedWhatsAppJob,
  WhatsAppNotificationJobName,
  WhatsAppNotificationJobResult,
  WHATSAPP_NOTIFICATION_JOB_NAMES,
} from 'src/notifications/jobs/whatsapp-notification.jobs';
import { ServiceOrderStatus } from '@prisma/client';

describe('WhatsAppNotificationsProcessor', () => {
  const handleMock = jest.fn();
  const handlerMock = {
    handle: handleMock,
  } as unknown as ServiceOrderStatusWhatsAppNotificationHandler;
  const loggerLogMock = jest.fn();
  const loggerErrorMock = jest.fn();
  const loggerMock = {
    log: loggerLogMock,
    warn: jest.fn(),
    error: loggerErrorMock,
  } as unknown as Logger;

  function buildJob(
    overrides: Partial<ServiceOrderStatusChangedWhatsAppJob> = {},
  ): Job<
    ServiceOrderStatusChangedWhatsAppJob,
    WhatsAppNotificationJobResult,
    WhatsAppNotificationJobName
  > {
    return {
      id: 'job-1',
      name: WHATSAPP_NOTIFICATION_JOB_NAMES.SERVICE_ORDER_STATUS_CHANGED,
      data: {
        eventId: 'event-1',
        workshopId: null,
        serviceOrderId: 'os-1',
        previousStatus: ServiceOrderStatus.ABERTA,
        currentStatus: ServiceOrderStatus.EM_ANDAMENTO,
        occurredAt: '2030-01-01T00:00:00.000Z',
        ...overrides,
      },
      attemptsMade: 1,
      opts: { attempts: 5 },
    } as Job<
      ServiceOrderStatusChangedWhatsAppJob,
      WhatsAppNotificationJobResult,
      WhatsAppNotificationJobName
    >;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    handleMock.mockResolvedValue({ status: 'SENT' });
  });

  it('should dispatch known WhatsApp notification jobs to the handler', async () => {
    const processor = new WhatsAppNotificationsProcessor(handlerMock, loggerMock);
    const job = buildJob();

    const result = await processor.process(job);

    expect(result).toEqual({ status: 'SENT' });
    expect(handleMock).toHaveBeenCalledWith(job.data);
    expect(loggerLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queue: QUEUE_NAMES.WHATSAPP_NOTIFICATIONS,
        jobId: 'job-1',
        jobName: WHATSAPP_NOTIFICATION_JOB_NAMES.SERVICE_ORDER_STATUS_CHANGED,
        eventId: 'event-1',
        serviceOrderId: 'os-1',
        attemptsMade: 1,
        attempts: 5,
      }),
      'WhatsApp notification job started',
    );
  });

  it('should log failed jobs with traceable metadata', () => {
    const processor = new WhatsAppNotificationsProcessor(handlerMock, loggerMock);
    const job = buildJob();
    const error = new Error('provider unavailable');

    processor.onFailed(job, error);

    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queue: QUEUE_NAMES.WHATSAPP_NOTIFICATIONS,
        jobId: 'job-1',
        eventId: 'event-1',
        serviceOrderId: 'os-1',
        errorName: 'Error',
        errorMessage: 'provider unavailable',
      }),
      'WhatsApp notification job failed',
    );
  });
});
