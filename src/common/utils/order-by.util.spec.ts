import { buildSafeOrderBy } from 'src/common/utils/order-by.util';

describe('buildSafeOrderBy', () => {
  const allowedFields = new Set(['createdAt', 'updatedAt', 'name']);

  it('should use the requested field when it is allowed', () => {
    expect(buildSafeOrderBy(allowedFields, 'name', 'createdAt', 'asc')).toEqual({
      name: 'asc',
    });
  });

  it('should fall back to the default field when the requested field is missing', () => {
    expect(buildSafeOrderBy(allowedFields, undefined, 'createdAt', 'desc')).toEqual({
      createdAt: 'desc',
    });
  });

  it('should fall back to the default field when the requested field is not allowed', () => {
    expect(buildSafeOrderBy(allowedFields, 'unsafeField', 'createdAt', 'desc')).toEqual({
      createdAt: 'desc',
    });
  });
});
