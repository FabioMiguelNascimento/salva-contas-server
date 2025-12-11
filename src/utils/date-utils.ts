export function parseDateLocal(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;

  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = value.getUTCMonth();
    const d = value.getUTCDate();
    return new Date(y, m, d);
  }

  if (typeof value === 'string') {
    const isoDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateMatch) {
      const [_, yy, mm, dd] = isoDateMatch;
      return new Date(Number(yy), Number(mm) - 1, Number(dd));
    }

    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}
