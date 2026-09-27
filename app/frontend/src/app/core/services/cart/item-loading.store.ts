import { BehaviorSubject, Observable } from 'rxjs';

/** A cart row has no id of its own until the server gives it one, so the product and the chosen
 * option identify it. */
export function cartItemKey(productId: number, typeId?: string): string {
  return `${productId}_${typeId ?? 'default'}`;
}

/** The rows with a request in flight, so each one can show its own spinner. */
export class ItemLoadingStore {
  private readonly keys = new Set<string>();
  private readonly subject = new BehaviorSubject<Set<string>>(new Set());

  readonly keys$: Observable<Set<string>> = this.subject.asObservable();

  start(key: string): void {
    this.keys.add(key);
    this.emit();
  }

  finish(key: string): void {
    this.keys.delete(key);
    this.emit();
  }

  has(key: string): boolean {
    return this.keys.has(key);
  }

  clear(): void {
    this.keys.clear();
    this.emit();
  }

  private emit(): void {
    this.subject.next(new Set(this.keys));
  }
}
