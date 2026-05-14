export const QUEUE_NAMES = {
  WHATSAPP_NOTIFICATIONS: 'notifications.whatsapp',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const DEFAULT_QUEUE_PREFIX = 'oficina';

export const DEFAULT_WHATSAPP_NOTIFICATION_JOB_OPTIONS = {
  attempts: 5,
  backoffDelayMs: 5000,
  removeOnCompleteAgeSeconds: 24 * 60 * 60,
  removeOnCompleteCount: 1000,
  removeOnFailAgeSeconds: 7 * 24 * 60 * 60,
  removeOnFailCount: 5000,
} as const;
