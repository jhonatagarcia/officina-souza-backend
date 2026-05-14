import { Injectable } from '@nestjs/common';
import { Prisma, ServiceOrderStatus } from '@prisma/client';
import { Logger } from 'nestjs-pino';
import {
  WhatsAppCloudApiService,
  WhatsAppSendResult,
} from 'src/notifications/whatsapp-cloud-api.service';
import { normalizeBrazilWhatsAppPhone } from 'src/notifications/whatsapp-phone.util';
import { RetryableNotificationJobError } from 'src/notifications/jobs/notification-job.errors';
import {
  ServiceOrderStatusChangedWhatsAppJob,
  WhatsAppNotificationJobResult,
} from 'src/notifications/jobs/whatsapp-notification.jobs';
import { ServiceOrderWhatsAppMessageService } from 'src/notifications/services/service-order-whatsapp-message.service';
import { WhatsAppIntegrationSettingsService } from 'src/notifications/services/whatsapp-integration-settings.service';
import { PrismaService } from 'src/prisma/prisma.service';

type ServiceOrderWithClient = Prisma.ServiceOrderGetPayload<{
  include: { client: true };
}>;

interface PreparedWhatsAppNotification {
  ready: true;
  phone: string;
  template: {
    name: string;
    languageCode: string;
    headerParameters: string[];
    bodyParameters: string[];
  };
}

interface SkippedWhatsAppNotification {
  ready: false;
  result: WhatsAppNotificationJobResult;
}

type BuildWhatsAppNotificationResult = PreparedWhatsAppNotification | SkippedWhatsAppNotification;

@Injectable()
export class ServiceOrderStatusWhatsAppNotificationHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppMessageService: ServiceOrderWhatsAppMessageService,
    private readonly whatsAppCloudApiService: WhatsAppCloudApiService,
    private readonly integrationSettings: WhatsAppIntegrationSettingsService,
    private readonly logger: Logger,
  ) {}

  async handle(
    payload: ServiceOrderStatusChangedWhatsAppJob,
  ): Promise<WhatsAppNotificationJobResult> {
    if (payload.previousStatus === payload.currentStatus) {
      return { status: 'SKIPPED', reason: 'STATUS_UNCHANGED' };
    }

    if (!this.whatsAppMessageService.shouldSendForStatus(payload.currentStatus)) {
      return { status: 'SKIPPED', reason: 'STATUS_NOT_NOTIFIABLE' };
    }

    const integrationStatus = this.integrationSettings.getStatusForWorkshop(payload.workshopId);
    if (!integrationStatus.active) {
      return {
        status: 'SKIPPED',
        reason: integrationStatus.reason ?? 'WHATSAPP_INTEGRATION_INACTIVE',
      };
    }

    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: payload.serviceOrderId },
      include: { client: true },
    });

    if (!serviceOrder) {
      return { status: 'FAILED', reason: 'SERVICE_ORDER_NOT_FOUND' };
    }

    const tenantGuard = this.validateTenantScope(payload, serviceOrder);
    if (tenantGuard) {
      return tenantGuard;
    }

    const notification = this.buildNotification(payload.currentStatus, serviceOrder);
    if (!notification.ready) {
      return notification.result;
    }

    const result = await this.whatsAppCloudApiService.sendTemplateMessage({
      to: notification.phone,
      templateName: notification.template.name,
      languageCode: notification.template.languageCode,
      headerParameters: notification.template.headerParameters,
      bodyParameters: notification.template.bodyParameters,
    });

    if (!result.success) {
      return this.handleSendFailure(payload, result);
    }

    return { status: 'SENT' };
  }

  private validateTenantScope(
    payload: ServiceOrderStatusChangedWhatsAppJob,
    serviceOrder: ServiceOrderWithClient,
  ): WhatsAppNotificationJobResult | null {
    if (!payload.workshopId) {
      return null;
    }

    const serviceOrderWorkshopId = this.extractWorkshopId(serviceOrder);
    if (serviceOrderWorkshopId === payload.workshopId) {
      return null;
    }

    this.logger.warn(
      {
        eventId: payload.eventId,
        serviceOrderId: payload.serviceOrderId,
        workshopId: payload.workshopId,
        hasPersistedWorkshopScope: Boolean(serviceOrderWorkshopId),
      },
      'WhatsApp notification skipped because tenant scope did not match',
    );

    return {
      status: 'SKIPPED',
      reason: serviceOrderWorkshopId ? 'TENANT_SCOPE_MISMATCH' : 'TENANT_SCOPE_UNSUPPORTED',
    };
  }

  private buildNotification(
    status: ServiceOrderStatus,
    serviceOrder: ServiceOrderWithClient,
  ): BuildWhatsAppNotificationResult {
    if (!serviceOrder.client) {
      return { ready: false, result: { status: 'FAILED', reason: 'CLIENT_NOT_FOUND' } };
    }

    const message = this.whatsAppMessageService.buildStatusMessage(
      status,
      serviceOrder.client.name,
    );
    if (!message?.trim()) {
      return { ready: false, result: { status: 'FAILED', reason: 'MESSAGE_NOT_AVAILABLE' } };
    }

    const template = this.whatsAppMessageService.buildStatusTemplate(
      status,
      serviceOrder.client.name,
    );
    if (!template) {
      return { ready: false, result: { status: 'FAILED', reason: 'TEMPLATE_NOT_AVAILABLE' } };
    }

    if (!serviceOrder.client.phone?.trim()) {
      return { ready: false, result: { status: 'FAILED', reason: 'CLIENT_PHONE_MISSING' } };
    }

    const phone = normalizeBrazilWhatsAppPhone(serviceOrder.client.phone);
    if (!phone) {
      return { ready: false, result: { status: 'FAILED', reason: 'CLIENT_PHONE_INVALID' } };
    }

    return {
      ready: true,
      phone,
      template,
    };
  }

  private handleSendFailure(
    payload: ServiceOrderStatusChangedWhatsAppJob,
    result: WhatsAppSendResult,
  ): WhatsAppNotificationJobResult {
    const failureResult: WhatsAppNotificationJobResult = {
      status: 'FAILED',
      reason: result.errorCode ?? 'WHATSAPP_API_ERROR',
      details: result.errorDetails ?? result.errorMessage,
      providerStatusCode: result.providerStatusCode,
      fbTraceId: result.fbTraceId,
    };

    if (this.isRetryableFailure(result)) {
      this.logger.warn(
        {
          eventId: payload.eventId,
          serviceOrderId: payload.serviceOrderId,
          workshopId: payload.workshopId,
          reason: failureResult.reason,
          providerStatusCode: failureResult.providerStatusCode,
          fbTraceId: failureResult.fbTraceId,
        },
        'Retryable WhatsApp notification failure',
      );

      throw new RetryableNotificationJobError(
        'WhatsApp notification failed with retryable provider error',
        failureResult.reason ?? 'WHATSAPP_API_ERROR',
      );
    }

    this.logger.warn(
      {
        eventId: payload.eventId,
        serviceOrderId: payload.serviceOrderId,
        workshopId: payload.workshopId,
        reason: failureResult.reason,
        providerStatusCode: failureResult.providerStatusCode,
        fbTraceId: failureResult.fbTraceId,
      },
      'Non-retryable WhatsApp notification failure',
    );

    return failureResult;
  }

  private isRetryableFailure(result: WhatsAppSendResult): boolean {
    if (result.errorCode === 'REQUEST_FAILED') {
      return true;
    }

    const statusCode = result.providerStatusCode;
    if (!statusCode) {
      return false;
    }

    return (
      statusCode === 408 ||
      statusCode === 409 ||
      statusCode === 425 ||
      statusCode === 429 ||
      (statusCode >= 500 && statusCode < 600)
    );
  }

  private extractWorkshopId(value: unknown): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const workshopId = (value as Record<string, unknown>).workshopId;

    return typeof workshopId === 'string' && workshopId.trim() ? workshopId : null;
  }
}
