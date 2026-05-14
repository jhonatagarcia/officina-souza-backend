import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from 'nestjs-pino';
import { QUEUE_NAMES } from 'src/queue/queue.constants';
import { ServiceOrderStatusWhatsAppNotificationHandler } from 'src/notifications/jobs/handlers/service-order-status-whatsapp-notification.handler';
import {
  WhatsAppNotificationJobData,
  WhatsAppNotificationJobName,
  WhatsAppNotificationJobResult,
  WHATSAPP_NOTIFICATION_JOB_NAMES,
} from 'src/notifications/jobs/whatsapp-notification.jobs';

type WhatsAppNotificationJob = Job<
  WhatsAppNotificationJobData,
  WhatsAppNotificationJobResult,
  WhatsAppNotificationJobName
>;

@Processor(QUEUE_NAMES.WHATSAPP_NOTIFICATIONS)
export class WhatsAppNotificationsProcessor extends WorkerHost {
  constructor(
    private readonly statusNotificationHandler: ServiceOrderStatusWhatsAppNotificationHandler,
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: WhatsAppNotificationJob): Promise<WhatsAppNotificationJobResult> {
    this.logger.log(
      {
        queue: QUEUE_NAMES.WHATSAPP_NOTIFICATIONS,
        jobId: String(job.id),
        jobName: job.name,
        eventId: job.data.eventId,
        serviceOrderId: job.data.serviceOrderId,
        workshopId: job.data.workshopId,
        attemptsMade: job.attemptsMade,
        attempts: job.opts.attempts,
      },
      'WhatsApp notification job started',
    );

    switch (job.name) {
      case WHATSAPP_NOTIFICATION_JOB_NAMES.SERVICE_ORDER_STATUS_CHANGED:
        return this.statusNotificationHandler.handle(job.data);
      default:
        this.logger.warn(
          {
            queue: QUEUE_NAMES.WHATSAPP_NOTIFICATIONS,
            jobId: String(job.id),
            jobName: job.name,
          },
          'Unknown WhatsApp notification job skipped',
        );
        return { status: 'SKIPPED', reason: 'UNKNOWN_JOB_NAME' };
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: WhatsAppNotificationJob, result: WhatsAppNotificationJobResult): void {
    this.logger.log(
      {
        queue: QUEUE_NAMES.WHATSAPP_NOTIFICATIONS,
        jobId: String(job.id),
        jobName: job.name,
        eventId: job.data.eventId,
        serviceOrderId: job.data.serviceOrderId,
        workshopId: job.data.workshopId,
        resultStatus: result.status,
        reason: result.reason,
        attemptsMade: job.attemptsMade,
      },
      'WhatsApp notification job completed',
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: WhatsAppNotificationJob | undefined, error: Error): void {
    this.logger.error(
      {
        queue: QUEUE_NAMES.WHATSAPP_NOTIFICATIONS,
        jobId: job?.id ? String(job.id) : undefined,
        jobName: job?.name,
        eventId: job?.data.eventId,
        serviceOrderId: job?.data.serviceOrderId,
        workshopId: job?.data.workshopId,
        attemptsMade: job?.attemptsMade,
        attempts: job?.opts.attempts,
        errorName: error.name,
        errorMessage: error.message,
      },
      'WhatsApp notification job failed',
    );
  }
}
