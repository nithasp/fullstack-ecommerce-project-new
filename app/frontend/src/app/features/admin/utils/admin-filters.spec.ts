import { localDayStart, USER_FILTER_DEBOUNCE_MS } from './admin-filters';

describe('admin filter helpers', () => {
  it('should expose a debounce the two admin pages share', () => {
    expect(USER_FILTER_DEBOUNCE_MS).toBe(300);
  });

  describe('localDayStart', () => {
    it('should return the start of the given local day as ISO 8601', () => {
      const iso = localDayStart('2026-03-15');
      expect(iso).toBe(new Date('2026-03-15T00:00:00').toISOString());
    });

    it('should interpret the date in local time, not UTC', () => {
      // A UTC reading would drop the offset; this has to match what the browser calls midnight
      const local = new Date('2026-03-15T00:00:00');
      expect(new Date(localDayStart('2026-03-15')).getTime()).toBe(local.getTime());
      expect(new Date(localDayStart('2026-03-15')).getHours()).toBe(0);
    });

    it('should move the boundary forward by whole days', () => {
      const next = new Date(localDayStart('2026-03-15', 1));
      expect(next.getDate()).toBe(16);
      expect(next.getHours()).toBe(0);
    });

    it('should roll over a month boundary', () => {
      const next = new Date(localDayStart('2026-01-31', 1));
      expect(next.getMonth()).toBe(1);
      expect(next.getDate()).toBe(1);
    });

    it('should roll over a leap day', () => {
      const next = new Date(localDayStart('2028-02-28', 1));
      expect(next.getMonth()).toBe(1);
      expect(next.getDate()).toBe(29);
    });
  });
});
