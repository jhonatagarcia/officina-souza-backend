import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { JobsOptions, Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { Logger } from 'nestjs-pino';
import { DEFAULT_WHATSAPP_NOTIFICATION_JOB_OPTIONS, QUEUE_NAMES } from 'src/queue/queue.constants';
import { ServiceOrderStatusNotificationPublisher } from 'src/service-orders/notifications/service-order-status-notification.publisher';
import {
  EnqueueServiceOrderStatusChangedWhatsAppInput,
  ServiceOrderStatusChangedWhatsAppJob,
  WhatsAppNotificationJobData,
  WhatsAppNotificationJobName,
  WhatsAppNotificationJobResult,
  WHATSAPP_NOTIFICATION_JOB_NAMES,
} from 'src/notifications/jobs/whatsapp-notification.jobs';
import { ServiceOrderWhatsAppNotificationDto } from 'src/service-orders/dto/service-order-response.dto';

@Injectable()
export class WhatsAppNotificationQueueProducer extends ServiceOrderStatusNotificationPublisher {
  constructor(
    @InjectQueue(QUEUE_NAMES.WHATSAPP_NOTIFICATIONS)
    private readonly queue: Queue<
      WhatsAppNotificationJobData,
      WhatsAppNotificationJobResult,
      WhatsAppNotificationJobName
    >,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    super();
  }

  async publishServiceOrderStatusChanged(
    input: EnqueueServiceOrderStatusChangedWhatsAppInput,
  ): Promise<ServiceOrderWhatsAppNotificationDto> {
    const jobData: ServiceOrderStatusChangedWhatsAppJob = {
      eventId: randomUUID(),
      workshopId: input.workshopId,
      serviceOrderId: input.serviceOrderId,
      previousStatus: input.previousStatus,
      currentStatus: input.currentStatus,
      occurredAt: new Date().toISOString(),
    };
    const jobOptions = this.buildJobOptions(jobData);

    const job = await this.queue.add(
      WHATSAPP_NOTIFICATION_JOB_NAMES.SERVICE_ORDER_STATUS_CHANGED,
      jobData,
      jobOptions,
    );

    this.logger.log(
      {
        queue: QUEUE_NAMES.WHATSAPP_NOTIFICATIONS,
        jobId: String(job.id ?? jobOptions.jobId),
        eventId: jobData.eventId,
        serviceOrderId: jobData.serviceOrderId,
        workshopId: jobData.workshopId,
        currentStatus: jobData.currentStatus,
      },
      'WhatsApp notification job queued',
    );

    return {
      status: 'QUEUED',
      jobId: String(job.id ?? jobOptions.jobId),
    };
  }

  private buildJobOptions(jobData: ServiceOrderStatusChangedWhatsAppJob): JobsOptions {
    const attempts =
      this.configService.get<number>('queue.notifications.whatsapp.attempts') ??
      DEFAULT_WHATSAPP_NOTIFICATION_JOB_OPTIONS.attempts;
    const backoffDelayMs =
      this.configService.get<number>('queue.notifications.whatsapp.backoffDelayMs') ??
      DEFAULT_WHATSAPP_NOTIFICATION_JOB_OPTIONS.backoffDelayMs;

    return {
      jobId: this.buildJobId(jobData),
      attempts,
      backoff: {
        type: 'exponential',
        delay: backoffDelayMs,
      },
      removeOnComplete: {
        age: DEFAULT_WHATSAPP_NOTIFICATION_JOB_OPTIONS.removeOnCompleteAgeSeconds,
        count: DEFAULT_WHATSAPP_NOTIFICATION_JOB_OPTIONS.removeOnCompleteCount,
      },
      removeOnFail: {
        age: DEFAULT_WHATSAPP_NOTIFICATION_JOB_OPTIONS.removeOnFailAgeSeconds,
        count: DEFAULT_WHATSAPP_NOTIFICATION_JOB_OPTIONS.removeOnFailCount,
      },
    };
  }

  private buildJobId(jobData: ServiceOrderStatusChangedWhatsAppJob): string {
    const tenantScope = jobData.workshopId ?? 'single-tenant';

    return [
      WHATSAPP_NOTIFICATION_JOB_NAMES.SERVICE_ORDER_STATUS_CHANGED,
      tenantScope,
      jobData.serviceOrderId,
      jobData.currentStatus,
      jobData.eventId,
    ].join(':');
  }
}
