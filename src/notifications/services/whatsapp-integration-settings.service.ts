import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WhatsAppIntegrationStatus {
  active: boolean;
  reason?: 'CONFIGURATION_MISSING';
}

@Injectable()
export class WhatsAppIntegrationSettingsService {
  constructor(private readonly configService: ConfigService) {}

  getStatusForWorkshop(_workshopId: string | null): WhatsAppIntegrationStatus {
    const accessToken = this.configService.get<string>('whatsapp.accessToken')?.trim();
    const phoneNumberId = this.configService.get<string>('whatsapp.phoneNumberId')?.trim();

    if (!accessToken || !phoneNumberId) {
      return { active: false, reason: 'CONFIGURATION_MISSING' };
    }

    return { active: true };
  }
}
