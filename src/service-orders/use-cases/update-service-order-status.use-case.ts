import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceOrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateServiceOrderStatusDto } from 'src/service-orders/dto/update-service-order-status.dto';

@Injectable()
export class UpdateServiceOrderStatusUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, updateStatusDto: UpdateServiceOrderStatusDto) {
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id },
    });

    if (!serviceOrder) {
      throw new NotFoundException('Service order not found');
    }

    this.assertStatusTransition(serviceOrder.status, updateStatusDto.status);

    const updateData: Prisma.ServiceOrderUpdateInput = {
      status: updateStatusDto.status,
    };

    if (updateStatusDto.status === ServiceOrderStatus.FINALIZADA) {
      updateData.finishedAt = new Date();
    }

    if (updateStatusDto.status === ServiceOrderStatus.ENTREGUE) {
      updateData.deliveredAt = new Date();
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.serviceOrder.update({
        where: { id },
        data: updateData,
      });

      if (updateStatusDto.status === ServiceOrderStatus.FINALIZADA) {
        await this.registerHistory(updated.id, tx);
      }

      return updated;
    });
  }

  private assertStatusTransition(
    currentStatus: ServiceOrderStatus,
    nextStatus: ServiceOrderStatus,
  ) {
    const transitions: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
      [ServiceOrderStatus.ABERTA]: [
        ServiceOrderStatus.ABERTA,
        ServiceOrderStatus.EM_ANDAMENTO,
        ServiceOrderStatus.FINALIZADA,
      ],
      [ServiceOrderStatus.EM_ANDAMENTO]: [
        ServiceOrderStatus.EM_ANDAMENTO,
        ServiceOrderStatus.FINALIZADA,
      ],
      [ServiceOrderStatus.FINALIZADA]: [ServiceOrderStatus.FINALIZADA, ServiceOrderStatus.ENTREGUE],
      [ServiceOrderStatus.ENTREGUE]: [ServiceOrderStatus.ENTREGUE],
    };

    if (!transitions[currentStatus].includes(nextStatus)) {
      throw new BadRequestException('Invalid service order status transition');
    }

    if (
      nextStatus === ServiceOrderStatus.ENTREGUE &&
      currentStatus !== ServiceOrderStatus.FINALIZADA
    ) {
      throw new BadRequestException('Service order can only be delivered after finalization');
    }
  }

  private async registerHistory(serviceOrderId: string, tx: Prisma.TransactionClient) {
    const serviceOrder = await tx.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      include: {
        vehicle: true,
        parts: {
          include: { inventoryItem: true },
        },
        budget: true,
      },
    });

    if (!serviceOrder) {
      throw new NotFoundException('Service order not found');
    }

    const partsSummary = serviceOrder.parts
      .map((part) => `${part.inventoryItem.name} x${part.quantity}`)
      .join(', ');

    const existingHistory = await tx.vehicleHistory.findFirst({
      where: { serviceOrderId: serviceOrder.id },
    });

    if (existingHistory) {
      await tx.vehicleHistory.update({
        where: { id: existingHistory.id },
        data: {
          entryDate: serviceOrder.finishedAt ?? new Date(),
          mileage: serviceOrder.vehicle.mileage,
          servicesSummary: serviceOrder.servicesPerformed ?? serviceOrder.problemDescription,
          partsSummary: partsSummary || null,
          totalAmount: serviceOrder.budget?.total ?? null,
        },
      });

      return;
    }

    await tx.vehicleHistory.create({
      data: {
        vehicleId: serviceOrder.vehicleId,
        serviceOrderId: serviceOrder.id,
        entryDate: serviceOrder.finishedAt ?? new Date(),
        mileage: serviceOrder.vehicle.mileage,
        servicesSummary: serviceOrder.servicesPerformed ?? serviceOrder.problemDescription,
        partsSummary: partsSummary || null,
        totalAmount: serviceOrder.budget?.total ?? null,
      },
    });
  }
}
