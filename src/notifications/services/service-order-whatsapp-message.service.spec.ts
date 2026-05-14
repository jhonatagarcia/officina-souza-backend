import { ConfigService } from '@nestjs/config';
import { ServiceOrderStatus } from '@prisma/client';
import { ServiceOrderWhatsAppMessageService } from 'src/notifications/services/service-order-whatsapp-message.service';

describe('ServiceOrderWhatsAppMessageService', () => {
  it('should build delivered template with header and client body parameter', () => {
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'whatsapp.templateLanguage': 'pt_BR',
          'whatsapp.templateHeaderText': 'Oficina Paiva',
          'whatsapp.templates.serviceOrderDelivered': 'ordem_entregue',
        };

        return values[key];
      }),
    } as unknown as ConfigService;
    const service = new ServiceOrderWhatsAppMessageService(configService);

    expect(service.buildStatusTemplate(ServiceOrderStatus.ENTREGUE, 'Jamille Bentica')).toEqual({
      name: 'ordem_entregue',
      languageCode: 'pt_BR',
      headerParameters: ['Oficina Paiva'],
      bodyParameters: ['Jamille Bentica'],
    });
  });
});
