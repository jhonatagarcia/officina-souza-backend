import { getCurrentMonthRange } from 'src/common/utils/date-period.util';

describe('getCurrentMonthRange', () => {
  it('should return the local start and exclusive local end of the reference month', () => {
    const range = getCurrentMonthRange(new Date(2026, 4, 15, 18, 30));

    expect(range.start).toEqual(new Date(2026, 4, 1, 0, 0, 0, 0));
    expect(range.end).toEqual(new Date(2026, 5, 1, 0, 0, 0, 0));
  });
});
