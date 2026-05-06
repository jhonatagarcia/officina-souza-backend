export type SortOrder = 'asc' | 'desc';

export function buildSafeOrderBy<TField extends string>(
  allowedFields: ReadonlySet<TField>,
  requestedField: string | undefined,
  defaultField: TField,
  sortOrder: SortOrder,
): Record<TField, SortOrder> {
  const sortBy = allowedFields.has(requestedField as TField)
    ? (requestedField as TField)
    : defaultField;

  return { [sortBy]: sortOrder } as Record<TField, SortOrder>;
}
