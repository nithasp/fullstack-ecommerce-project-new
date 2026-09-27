export function trackById<T extends { id: string | number }>(_index: number, item: T): string | number {
  return item.id;
}

export function trackByValue<T extends string | number>(_index: number, item: T): T {
  return item;
}

export function trackByIndex(index: number): number {
  return index;
}
