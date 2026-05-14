import { ConfigService } from '@nestjs/config';
import { ServiceOrderStatus } from '@prisma/client';
import { JobsOptions, Queue } from 'bullmq';
import { Logger } from 'nestjs-pino';
import { QUEUE_NAMES } from 'src/queue/queue.constants';
import { WhatsAppNotificationQueueProducer } from 'src/notifications/jobs/whatsapp-notification-queue.producer';
import {
  ServiceOrderStatusChangedWhatsAppJob,
  WhatsAppNotificationJobData,
  WhatsAppNotificationJobName,
  WhatsAppNotificationJobResult,
  WHATSAPP_NOTIFICATION_JOB_NAMES,
} from 'src/notifications/jobs/whatsapp-notification.jobs';

describe('WhatsAppNotificationQueueProducer', () => {
  const addMock = jest.fn();
  const queueMock = {
    add: addMock,
  } as unknown as Queue<
    WhatsAppNotificationJobData,
    WhatsAppNotificationJobResult,
    WhatsAppNotificationJobName
  >;
  const configServiceMock = {
    get: jest.fn((key: string) => {
      const values: Record<string, number> = {
        'queue.notifications.whatsapp.attempts': 3,
        'queue.notifications.whatsapp.backoffDelayMs': 1000,
      };

      return values[key];
    }),
  } as unknown as ConfigService;
  const loggerLogMock = jest.fn();
  const loggerMock = {
    log: loggerLogMock,
  } as unknown as Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    addMock.mockResolvedValue({ id: 'job-1' });
  });

  it('should enqueue a minimal service order status notification job with retry options', async () => {
    const producer = new WhatsAppNotificationQueueProducer(
      queueMock,
      configServiceMock,
      loggerMock,
    );

    const result = await producer.publishServiceOrderStatusChanged({
      workshopId: 'workshop-1',
      serviceOrderId: 'os-1',
      previousStatus: ServiceOrderStatus.ABERTA,
      currentStatus: ServiceOrderStatus.EM_ANDAMENTO,
    });

    expect(result).toEqual({ status: 'QUEUED', jobId: 'job-1' });
    expect(addMock).toHaveBeenCalledTimes(1);

    const [jobName, payload, options] = addMock.mock.calls[0] as [
      WhatsAppNotificationJobName,
      ServiceOrderStatusChangedWhatsAppJob,
      JobsOptions,
    ];

    expect(jobName).toBe(WHATSAPP_NOTIFICATION_JOB_NAMES.SERVICE_ORDER_STATUS_CHANGED);
    expect(Object.keys(payload).sort()).toEqual([
      'currentStatus',
      'eventId',
      'occurredAt',
      'previousStatus',
      'serviceOrderId',
      'workshopId',
    ]);
    expect(payload).toEqual(
      expect.objectContaining({
        workshopId: 'workshop-1',
        serviceOrderId: 'os-1',
        previousStatus: ServiceOrderStatus.ABERTA,
        currentStatus: ServiceOrderStatus.EM_ANDAMENTO,
      }),
    );
    expect(options).toEqual(
      expect.objectContaining({
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 604800, count: 5000 },
      }),
    );
    expect(String(options.jobId)).toContain('service-order.status-changed:workshop-1:os-1');
    expect(loggerLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queue: QUEUE_NAMES.WHATSAPP_NOTIFICATIONS,
        jobId: 'job-1',
        serviceOrderId: 'os-1',
        workshopId: 'workshop-1',
      }),
      'WhatsApp notification job queued',
    );
  });
});
