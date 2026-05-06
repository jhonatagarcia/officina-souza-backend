export interface DateRange {
  start: Date;
  end: Date;
}

export function getCurrentMonthRange(referenceDate = new Date()): DateRange {
  const start = new Date(referenceDate);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return { start, end };
}
