import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceOrderStatus } from '@prisma/client';

const WHATSAPP_NOTIFIABLE_STATUSES = new Set<ServiceOrderStatus>([
  ServiceOrderStatus.EM_ANDAMENTO,
  ServiceOrderStatus.FINALIZADA,
  ServiceOrderStatus.ENTREGUE,
]);

@Injectable()
export class ServiceOrderWhatsAppMessageService {
  constructor(private readonly configService: ConfigService) {}

  shouldSendForStatus(status: ServiceOrderStatus): boolean {
    return WHATSAPP_NOTIFIABLE_STATUSES.has(status);
  }

  buildStatusMessage(status: ServiceOrderStatus, clientName?: string | null): string | null {
    if (!this.shouldSendForStatus(status)) {
      return null;
    }

    const normalizedClientName = clientName?.trim();
    if (!normalizedClientName) {
      return null;
    }

    if (status === ServiceOrderStatus.EM_ANDAMENTO) {
      return `Olá ${normalizedClientName} o serviço do seu carro esta em andamento`;
    }

    if (status === ServiceOrderStatus.FINALIZADA) {
      return `Olá ${normalizedClientName} o serviço do seu carro esta finalizado, pode vir retirar`;
    }

    if (status === ServiceOrderStatus.ENTREGUE) {
      return `Olá ${normalizedClientName}, obrigado pela confiança em nossos serviços. Volte sempre.`;
    }

    return null;
  }

  buildStatusTemplate(
    status: ServiceOrderStatus,
    clientName?: string | null,
  ): {
    name: string;
    languageCode: string;
    headerParameters: string[];
    bodyParameters: string[];
  } | null {
    if (!this.shouldSendForStatus(status)) {
      return null;
    }

    const name = this.getTemplateName(status);
    const languageCode =
      this.configService.get<string>('whatsapp.templateLanguage')?.trim() || 'pt_BR';

    if (!name || !languageCode) {
      return null;
    }

    if (name === 'hello_world') {
      return { name, languageCode, headerParameters: [], bodyParameters: [] };
    }

    const normalizedClientName = clientName?.trim();
    if (!normalizedClientName) {
      return null;
    }

    return {
      name,
      languageCode,
      headerParameters: this.buildHeaderParameters(),
      bodyParameters: [normalizedClientName],
    };
  }

  private buildHeaderParameters(): string[] {
    const headerText = this.configService.get<string>('whatsapp.templateHeaderText')?.trim();

    return headerText ? [headerText] : [];
  }

  private getTemplateName(status: ServiceOrderStatus): string | null {
    const templateByStatus: Partial<Record<ServiceOrderStatus, string | undefined>> = {
      [ServiceOrderStatus.EM_ANDAMENTO]: this.configService.get<string>(
        'whatsapp.templates.serviceOrderInProgress',
      ),
      [ServiceOrderStatus.FINALIZADA]: this.configService.get<string>(
        'whatsapp.templates.serviceOrderFinished',
      ),
      [ServiceOrderStatus.ENTREGUE]: this.configService.get<string>(
        'whatsapp.templates.serviceOrderDelivered',
      ),
    };

    return templateByStatus[status]?.trim() || null;
  }
}
