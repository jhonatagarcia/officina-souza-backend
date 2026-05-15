export function normalizeCnpj(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;

  const digits = value.replace(/\D/g, '');
  return digits ? digits : null;
}

export function isValidCnpj(value: string | null | undefined): boolean {
  const cnpj = normalizeCnpj(value);

  if (!cnpj || cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const digits = cnpj.split('').map(Number);
  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondWeights = [6, ...firstWeights];

  const calculateDigit = (weights: number[]) => {
    const sum = weights.reduce((total, weight, index) => total + (digits[index] ?? 0) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return (
    calculateDigit(firstWeights) === digits[12] && calculateDigit(secondWeights) === digits[13]
  );
}
