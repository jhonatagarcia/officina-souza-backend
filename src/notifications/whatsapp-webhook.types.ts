export interface WhatsAppWebhookPayload {
  object?: string;
  entry?: WhatsAppWebhookEntry[];
}

export interface WhatsAppWebhookEntry {
  id?: string;
  changes?: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookChange {
  field?: string;
  value?: WhatsAppWebhookValue;
}

export interface WhatsAppWebhookValue {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: Array<{
    profile?: {
      name?: string;
    };
    wa_id?: string;
  }>;
  messages?: WhatsAppWebhookMessage[];
  statuses?: WhatsAppWebhookStatus[];
}

export interface WhatsAppWebhookMessage {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
}

export interface WhatsAppWebhookStatus {
  id?: string;
  recipient_id?: string;
  status?: string;
  timestamp?: string;
  errors?: Array<{
    code?: number;
    title?: string;
    message?: string;
  }>;
}

export interface WhatsAppWebhookSummary {
  object: string | null;
  entryCount: number;
  messageCount: number;
  statusCount: number;
  phoneNumberIds: string[];
  messageTypes: Record<string, number>;
  statusTypes: Record<string, number>;
}

export interface WhatsAppWebhookResponse {
  received: true;
  summary: WhatsAppWebhookSummary;
}
