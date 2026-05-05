import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateServiceOrderDto } from 'src/service-orders/dto/create-service-order.dto';
import { ServiceOrderReferenceValidatorService } from 'src/service-orders/services/service-order-reference-validator.service';
import { buildServiceOrderNumber } from 'src/service-orders/utils/service-order-number.util';
import { parseExpectedDeliveryAt } from 'src/service-orders/utils/expected-delivery-date.util';

@Injectable()
export class CreateServiceOrderUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referenceValidator: ServiceOrderReferenceValidatorService,
  ) {}

  async execute(createServiceOrderDto: CreateServiceOrderDto) {
    await this.referenceValidator.validate(
      createServiceOrderDto.clientId,
      createServiceOrderDto.vehicleId,
      createServiceOrderDto.mechanicId,
    );
    const orderNumber = await buildServiceOrderNumber(this.prisma);

    return this.prisma.serviceOrder.create({
      data: {
        orderNumber,
        clientId: createServiceOrderDto.clientId,
        vehicleId: createServiceOrderDto.vehicleId,
        mechanicId: createServiceOrderDto.mechanicId,
        problemDescription: createServiceOrderDto.problemDescription,
        diagnosis: createServiceOrderDto.diagnosis,
        servicesPerformed: createServiceOrderDto.servicesPerformed,
        vehicleChecklist: createServiceOrderDto.vehicleChecklist,
        expectedDeliveryAt: parseExpectedDeliveryAt(createServiceOrderDto.expectedDeliveryAt),
        notes: createServiceOrderDto.notes,
      },
      include: { client: true, vehicle: true, mechanic: true },
    });
  }
}
