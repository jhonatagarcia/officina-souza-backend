import { ServiceOrderStatus } from '@prisma/client';
import { ServiceOrderWhatsAppNotificationDto } from 'src/service-orders/dto/service-order-response.dto';

export interface PublishServiceOrderStatusChangedInput {
  workshopId: string | null;
  serviceOrderId: string;
  previousStatus: ServiceOrderStatus;
  currentStatus: ServiceOrderStatus;
}

export abstract class ServiceOrderStatusNotificationPublisher {
  abstract publishServiceOrderStatusChanged(
    input: PublishServiceOrderStatusChangedInput,
  ): Promise<ServiceOrderWhatsAppNotificationDto>;
}
