import { formatDateTime, formatDateOnly } from '../formatDate';

const makeTimestamp = isoString => ({
  toDate: () => new Date(isoString),
});

describe('formatDateTime', () => {
  it('retorna date e time formatados em pt-BR', () => {
    const ts = makeTimestamp('2024-06-15T14:30:00');
    const result = formatDateTime(ts);
    expect(result.date).toMatch(/15\/06\/2024/);
    expect(result.time).toMatch(/14:30/);
  });

  it('retorna { date: "-", time: "-" } quando timestamp é null', () => {
    expect(formatDateTime(null)).toEqual({ date: '-', time: '-' });
  });

  it('retorna { date: "-", time: "-" } quando timestamp é undefined', () => {
    expect(formatDateTime(undefined)).toEqual({ date: '-', time: '-' });
  });

  it('retorna { date: "-", time: "-" } quando timestamp não tem toDate()', () => {
    expect(formatDateTime({ foo: 'bar' })).toEqual({ date: '-', time: '-' });
  });
});

describe('formatDateOnly', () => {
  it('retorna data formatada em pt-BR', () => {
    const ts = makeTimestamp('2024-01-05T00:00:00');
    expect(formatDateOnly(ts)).toMatch(/05\/01\/2024/);
  });

  it('retorna "-" quando timestamp é null', () => {
    expect(formatDateOnly(null)).toBe('-');
  });

  it('retorna "-" quando timestamp é undefined', () => {
    expect(formatDateOnly(undefined)).toBe('-');
  });

  it('retorna "-" quando timestamp não tem toDate()', () => {
    expect(formatDateOnly(42)).toBe('-');
  });
});
