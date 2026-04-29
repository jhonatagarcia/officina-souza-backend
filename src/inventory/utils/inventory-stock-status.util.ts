export function isCriticalStock(quantity: number, minimumQuantity: number) {
  return quantity <= minimumQuantity;
}

export function isLowStock(quantity: number, minimumQuantity: number) {
  if (isCriticalStock(quantity, minimumQuantity)) {
    return true;
  }

  return quantity <= minimumQuantity * 1.5;
}
