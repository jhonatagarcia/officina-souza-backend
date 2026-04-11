import { Injectable, NotFoundException } from '@nestjs/common';
import { InventoryService } from 'src/inventory/inventory.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddServiceOrderPartDto } from 'src/service-orders/dto/add-service-order-part.dto';

@Injectable()
export class AddServiceOrderPartUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async execute(serviceOrderId: string, addPartDto: AddServiceOrderPartDto) {
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
    });

    if (!serviceOrder) {
      throw new NotFoundException('Ordem de servico nao encontrada');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.inventoryService.reserveOrConsumePart(
        addPartDto.inventoryItemId,
        addPartDto.quantity,
        tx,
      );

      const existingPart = await tx.serviceOrderPart.findFirst({
        where: {
          serviceOrderId,
          inventoryItemId: addPartDto.inventoryItemId,
        },
      });

      const nextQuantity = (existingPart?.quantity ?? 0) + addPartDto.quantity;
      const nextTotalPrice = nextQuantity * addPartDto.unitPrice;

      if (existingPart) {
        return tx.serviceOrderPart.update({
          where: { id: existingPart.id },
          data: {
            quantity: nextQuantity,
            unitPrice: addPartDto.unitPrice,
            totalPrice: nextTotalPrice,
          },
          include: { inventoryItem: true },
        });
      }

      return tx.serviceOrderPart.create({
        data: {
          serviceOrderId,
          inventoryItemId: addPartDto.inventoryItemId,
          quantity: nextQuantity,
          unitPrice: addPartDto.unitPrice,
          totalPrice: nextTotalPrice,
        },
        include: { inventoryItem: true },
      });
    });
  }
}
