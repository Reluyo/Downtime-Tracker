import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  formatDateTime,
  localDateKey,
  endOfDayIso,
  startOfDayIso,
  downloadCsv,
} from './format';

describe('formatDuration', () => {
  it('returns dash for null', () => {
    expect(formatDuration(null)).toBe('—');
  });

  it('returns dash for undefined', () => {
    expect(formatDuration(undefined)).toBe('—');
  });

  it('formats seconds only', () => {
    expect(formatDuration(5)).toBe('05s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2m 05s');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3661)).toBe('1h 1m 01s');
  });

  it('formats zero', () => {
    expect(formatDuration(0)).toBe('00s');
  });
});

describe('formatDateTime', () => {
  it('returns dash for null', () => {
    expect(formatDateTime(null)).toBe('—');
  });

  it('returns dash for undefined', () => {
    expect(formatDateTime(undefined)).toBe('—');
  });

  it('returns dash for empty string', () => {
    expect(formatDateTime('')).toBe('—');
  });

  it('formats a valid ISO string', () => {
    const result = formatDateTime('2024-01-15T10:30:00Z');
    expect(result).toBeTruthy();
    expect(result).not.toBe('—');
  });
});

describe('localDateKey', () => {
  it('returns YYYY-MM-DD for a date', () => {
    const result = localDateKey('2024-03-05T15:00:00');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('startOfDayIso / endOfDayIso', () => {
  it('startOfDayIso appends T00:00:00', () => {
    expect(startOfDayIso('2024-01-15')).toBe('2024-01-15T00:00:00');
  });

  it('endOfDayIso appends T23:59:59.999', () => {
    expect(endOfDayIso('2024-01-15')).toBe('2024-01-15T23:59:59.999');
  });
});

describe('downloadCsv', () => {
  it('escapes quotes in CSV values', () => {
    const createSpy = vi.spyOn(document, 'createElement');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');

    const mockAnchor = { href: '', download: '', click: vi.fn() } as unknown as HTMLAnchorElement;
    createSpy.mockReturnValue(mockAnchor);

    downloadCsv('test.csv', ['Name'], [['value with "quotes"']]);

    expect(mockAnchor.download).toBe('test.csv');
    expect(mockAnchor.click).toHaveBeenCalled();

    createSpy.mockRestore();
    createUrl.mockRestore();
    revokeUrl.mockRestore();
  });
});
