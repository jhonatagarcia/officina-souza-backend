export function normalizeBrazilWhatsAppPhone(phone?: string | null): string | null {
  const digits = phone?.replace(/\D/g, '') ?? '';

  if (!digits) {
    return null;
  }

  const withCountryCode = digits.startsWith('55') ? digits : `55${digits}`;
  const nationalNumber = withCountryCode.slice(2);

  if (withCountryCode.length < 12 || withCountryCode.length > 13) {
    return null;
  }

  if (!/^\d+$/.test(withCountryCode)) {
    return null;
  }

  if (!/^\d{2}9?\d{8}$/.test(nationalNumber)) {
    return null;
  }

  return withCountryCode;
}
