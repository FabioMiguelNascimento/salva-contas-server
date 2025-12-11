import { parseDateLocal } from './date-utils';

describe('parseDateLocal', () => {
  it('parses YYYY-MM-DD string to local date', () => {
    const d = parseDateLocal('2025-12-11');
    expect(d).not.toBeNull();
    const date = d as Date;
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(11);
    expect(date.getDate()).toBe(11);
    expect(date.getHours()).toBe(0);
  });

  it('parses Date created from YYYY-MM-DD preserving original date', () => {
    const original = new Date('2025-12-11');
    const parsed = parseDateLocal(original) as Date;
    expect(parsed.getFullYear()).toBe(2025);
    expect(parsed.getMonth()).toBe(11);
    expect(parsed.getDate()).toBe(11);
  });

  it('parses normal ISO datetime strings', () => {
    const d = parseDateLocal('2025-12-11T15:30:00Z');
    expect(d).not.toBeNull();
    const date = d as Date;
    expect(date.getUTCFullYear()).toBe(2025);
  });
});
