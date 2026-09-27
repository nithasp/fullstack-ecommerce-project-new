import { trackById, trackByIndex, trackByValue } from './track-by';

describe('trackBy helpers', () => {
  it('trackById should key on a numeric id', () => {
    expect(trackById(0, { id: 42 })).toBe(42);
  });

  it('trackById should key on a string id', () => {
    expect(trackById(3, { id: 'abc' })).toBe('abc');
  });

  it('trackById should ignore the position, so a reorder keeps the same key', () => {
    const item = { id: 7 };
    expect(trackById(0, item)).toBe(trackById(9, item));
  });

  it('trackByValue should use the value itself for primitives', () => {
    expect(trackByValue(0, 'Electronics')).toBe('Electronics');
    expect(trackByValue(1, 5)).toBe(5);
  });

  it('trackByIndex should fall back to the position', () => {
    expect(trackByIndex(0)).toBe(0);
    expect(trackByIndex(4)).toBe(4);
  });
});
