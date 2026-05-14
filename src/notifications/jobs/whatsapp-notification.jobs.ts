import { ServiceOrderStatus } from '@prisma/client';

export const WHATSAPP_NOTIFICATION_JOB_NAMES = {
  SERVICE_ORDER_STATUS_CHANGED: 'service-order.status-changed',
} as const;

export type WhatsAppNotificationJobName =
  (typeof WHATSAPP_NOTIFICATION_JOB_NAMES)[keyof typeof WHATSAPP_NOTIFICATION_JOB_NAMES];

export interface ServiceOrderStatusChangedWhatsAppJob {
  eventId: string;
  workshopId: string | null;
  serviceOrderId: string;
  previousStatus: ServiceOrderStatus;
  currentStatus: ServiceOrderStatus;
  occurredAt: string;
}

export type WhatsAppNotificationJobData = ServiceOrderStatusChangedWhatsAppJob;

export type WhatsAppNotificationJobStatus = 'SENT' | 'QUEUED' | 'SKIPPED' | 'FAILED';

export interface WhatsAppNotificationJobResult {
  status: Exclude<WhatsAppNotificationJobStatus, 'QUEUED'>;
  reason?: string;
  details?: string;
  providerStatusCode?: number;
  fbTraceId?: string;
}

export interface EnqueueServiceOrderStatusChangedWhatsAppInput {
  workshopId: string | null;
  serviceOrderId: string;
  previousStatus: ServiceOrderStatus;
  currentStatus: ServiceOrderStatus;
}
