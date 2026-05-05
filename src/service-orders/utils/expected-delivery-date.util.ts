import { BadRequestException } from '@nestjs/common';

function getDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseExpectedDeliveryAt(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);

  if (!match) {
    throw new BadRequestException('A previsao de entrega deve informar um ano com 4 digitos');
  }

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const expectedDeliveryAt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

  if (
    Number.isNaN(expectedDeliveryAt.getTime()) ||
    expectedDeliveryAt.getUTCFullYear() !== year ||
    expectedDeliveryAt.getUTCMonth() !== month - 1 ||
    expectedDeliveryAt.getUTCDate() !== day
  ) {
    throw new BadRequestException('A previsao de entrega deve ser uma data valida');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (`${yearValue}-${monthValue}-${dayValue}` < getDateInputValue(today)) {
    throw new BadRequestException('A previsao de entrega nao pode ser anterior ao dia atual');
  }

  return expectedDeliveryAt;
}
