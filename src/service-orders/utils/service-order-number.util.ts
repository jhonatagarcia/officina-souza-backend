interface ServiceOrderNumberReader {
  serviceOrder: {
    findMany(args: {
      where: { orderNumber: { startsWith: string } };
      select: { orderNumber: true };
    }): Promise<Array<{ orderNumber: string }>>;
  };
}

export async function buildServiceOrderNumber(prisma: ServiceOrderNumberReader): Promise<string> {
  const existingOrderNumbers = await prisma.serviceOrder.findMany({
    where: {
      orderNumber: {
        startsWith: 'OS',
      },
    },
    select: {
      orderNumber: true,
    },
  });

  const lastSequence = existingOrderNumbers.reduce((highestSequence, serviceOrder) => {
    const match = serviceOrder.orderNumber.match(/^OS(\d+)$/);
    if (!match) return highestSequence;

    const sequence = Number(match[1]);
    return Number.isFinite(sequence) ? Math.max(highestSequence, sequence) : highestSequence;
  }, 0);
  const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

  return `OS${nextSequence.toString().padStart(6, '0')}`;
}
