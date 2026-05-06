import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FinancialEntryType,
  FinancialStatus,
  InventoryMovementType,
  Prisma,
  ServiceOrderStatus,
} from '@prisma/client';
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
      throw new NotFoundException('Ordem de servico nao encontrada');
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

    const updatedServiceOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.serviceOrder.update({
        where: { id },
        data: updateData,
      });

      if (updateStatusDto.status === ServiceOrderStatus.FINALIZADA && updated.budgetId) {
        await this.consumeBudgetInventoryItems(updated.id, tx);
      }

      if (updateStatusDto.status === ServiceOrderStatus.FINALIZADA) {
        await this.registerHistory(updated.id, tx);
      }

      if (updateStatusDto.status === ServiceOrderStatus.ENTREGUE) {
        await this.createReceivableEntry(updated.id, tx);
      }

      return updated;
    });

    return updatedServiceOrder;
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
      throw new BadRequestException('Transicao de status da ordem de servico invalida');
    }

    if (
      nextStatus === ServiceOrderStatus.ENTREGUE &&
      currentStatus !== ServiceOrderStatus.FINALIZADA
    ) {
      throw new BadRequestException('A ordem de servico so pode ser entregue apos a finalizacao');
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
      throw new NotFoundException('Ordem de servico nao encontrada');
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

  private async consumeBudgetInventoryItems(serviceOrderId: string, tx: Prisma.TransactionClient) {
    const serviceOrder = await tx.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      include: {
        parts: true,
        budget: {
          include: {
            items: {
              where: {
                inventoryItemId: { not: null },
              },
              include: {
                inventoryItem: true,
              },
            },
          },
        },
      },
    });

    if (!serviceOrder?.budget?.items?.length) {
      return;
    }

    const existingInventoryItemIds = new Set(
      serviceOrder.parts.map((part) => part.inventoryItemId),
    );

    for (const item of serviceOrder.budget.items) {
      if (!item.inventoryItemId || existingInventoryItemIds.has(item.inventoryItemId)) {
        continue;
      }

      const result = await tx.inventoryItem.updateMany({
        where: {
          id: item.inventoryItemId,
          quantity: { gte: item.quantity },
        },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });

      if (result.count === 0) {
        throw new BadRequestException('Quantidade insuficiente em estoque');
      }

      const updatedInventoryItem = await tx.inventoryItem.findUniqueOrThrow({
        where: { id: item.inventoryItemId },
      });

      const serviceOrderPart = await tx.serviceOrderPart.create({
        data: {
          serviceOrderId,
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.inventoryItemId,
          serviceOrderId,
          serviceOrderPartId: serviceOrderPart.id,
          type: InventoryMovementType.OUT,
          quantityChange: -item.quantity,
          quantityBefore: updatedInventoryItem.quantity + item.quantity,
          quantityAfter: updatedInventoryItem.quantity,
          unitCost: updatedInventoryItem.cost,
          totalCost: new Prisma.Decimal(updatedInventoryItem.cost).mul(item.quantity),
          reason: `Saida de estoque por uso na ${serviceOrder.orderNumber}`,
        },
      });
    }
  }

  private async createReceivableEntry(serviceOrderId: string, tx: Prisma.TransactionClient) {
    const serviceOrder = await tx.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      include: {
        budget: true,
        parts: {
          select: {
            totalPrice: true,
          },
        },
        financialEntries: {
          where: { type: FinancialEntryType.RECEIVABLE },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!serviceOrder) {
      throw new NotFoundException('Ordem de servico nao encontrada');
    }

    if (serviceOrder.financialEntries.length > 0) {
      return;
    }

    const amount =
      serviceOrder.budget?.total ??
      serviceOrder.parts.reduce(
        (total, part) => total.plus(part.totalPrice),
        new Prisma.Decimal(0),
      );

    if (!amount || amount.lte(0)) {
      return;
    }

    await tx.financialEntry.create({
      data: {
        type: FinancialEntryType.RECEIVABLE,
        description: `Cobranca da ${serviceOrder.orderNumber}`,
        category: 'Ordem de Servico',
        amount,
        dueDate: serviceOrder.deliveredAt ?? new Date(),
        status: FinancialStatus.PENDENTE,
        clientId: serviceOrder.clientId,
        serviceOrderId: serviceOrder.id,
      },
    });
  }
}
