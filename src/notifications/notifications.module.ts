import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from 'src/queue/queue.constants';
import { QueueModule } from 'src/queue/queue.module';
import { ServiceOrderStatusNotificationPublisher } from 'src/service-orders/notifications/service-order-status-notification.publisher';
import { ServiceOrderStatusWhatsAppNotificationHandler } from 'src/notifications/jobs/handlers/service-order-status-whatsapp-notification.handler';
import { WhatsAppNotificationQueueProducer } from 'src/notifications/jobs/whatsapp-notification-queue.producer';
import { WhatsAppNotificationsProcessor } from 'src/notifications/jobs/whatsapp-notifications.processor';
import { ServiceOrderWhatsAppMessageService } from 'src/notifications/services/service-order-whatsapp-message.service';
import { WhatsAppIntegrationSettingsService } from 'src/notifications/services/whatsapp-integration-settings.service';
import { WhatsAppCloudApiService } from 'src/notifications/whatsapp-cloud-api.service';
import { WhatsAppWebhookController } from 'src/notifications/whatsapp-webhook.controller';
import { WhatsAppWebhookService } from 'src/notifications/whatsapp-webhook.service';

@Module({
  imports: [
    QueueModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.WHATSAPP_NOTIFICATIONS,
    }),
  ],
  controllers: [WhatsAppWebhookController],
  providers: [
    WhatsAppWebhookService,
    WhatsAppCloudApiService,
    ServiceOrderWhatsAppMessageService,
    WhatsAppIntegrationSettingsService,
    ServiceOrderStatusWhatsAppNotificationHandler,
    WhatsAppNotificationQueueProducer,
    WhatsAppNotificationsProcessor,
    {
      provide: ServiceOrderStatusNotificationPublisher,
      useExisting: WhatsAppNotificationQueueProducer,
    },
  ],
  exports: [ServiceOrderStatusNotificationPublisher],
})
export class NotificationsModule {}
