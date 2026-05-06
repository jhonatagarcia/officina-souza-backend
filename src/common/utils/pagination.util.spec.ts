import { buildPaginationMeta } from 'src/common/utils/pagination.util';

describe('buildPaginationMeta', () => {
  it('should preserve current pagination metadata behavior for empty results', () => {
    const meta = buildPaginationMeta({ page: 1, limit: 10, sortOrder: 'desc' }, 0);

    expect(meta).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    });
  });

  it('should round total pages up for partial pages', () => {
    const meta = buildPaginationMeta({ page: 2, limit: 10, sortOrder: 'asc' }, 21);

    expect(meta).toEqual({
      page: 2,
      limit: 10,
      total: 21,
      totalPages: 3,
    });
  });
});
