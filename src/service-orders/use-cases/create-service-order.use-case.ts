import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateServiceOrderDto } from 'src/service-orders/dto/create-service-order.dto';
import { ServiceOrderReferenceValidatorService } from 'src/service-orders/services/service-order-reference-validator.service';
import { buildServiceOrderNumber } from 'src/service-orders/utils/service-order-number.util';

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

    return this.prisma.serviceOrder.create({
      data: {
        orderNumber: buildServiceOrderNumber(),
        clientId: createServiceOrderDto.clientId,
        vehicleId: createServiceOrderDto.vehicleId,
        mechanicId: createServiceOrderDto.mechanicId,
        problemDescription: createServiceOrderDto.problemDescription,
        diagnosis: createServiceOrderDto.diagnosis,
        servicesPerformed: createServiceOrderDto.servicesPerformed,
        vehicleChecklist: createServiceOrderDto.vehicleChecklist,
        expectedDeliveryAt: createServiceOrderDto.expectedDeliveryAt
          ? new Date(createServiceOrderDto.expectedDeliveryAt)
          : undefined,
        notes: createServiceOrderDto.notes,
      },
      include: { client: true, vehicle: true, mechanic: true },
    });
  }
}
