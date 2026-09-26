// Without a trackBy, *ngFor keys rows by object identity, so a refetch that returns the same rows
// still tears down and rebuilds every one of them

export function trackById<T extends { id: string | number }>(_index: number, item: T): string | number {
  return item.id;
}

// For a list of plain strings or numbers, the value is the identity
export function trackByValue<T extends string | number>(_index: number, item: T): T {
  return item;
}

// Nothing stable to key on, so position is the best available answer
export function trackByIndex(index: number): number {
  return index;
}
