import { Module } from '@nestjs/common';
import { WhatsAppWebhookController } from 'src/notifications/whatsapp-webhook.controller';
import { WhatsAppWebhookService } from 'src/notifications/whatsapp-webhook.service';

@Module({
  controllers: [WhatsAppWebhookController],
  providers: [WhatsAppWebhookService],
})
export class NotificationsModule {}
