import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, Subject } from 'rxjs';
import { catchError, debounceTime, groupBy, mergeMap, switchMap } from 'rxjs/operators';
import { Product, ProductType } from '../../models/product.model';
import { CartItem, QuantityUpdate } from '../../models/cart.model';
import { CartApiService } from './cart-api.service';
import { CartApiItem } from '../../models/cart-api.model';
import { toCartItem } from './cart-item.mapper';
import { cartItemKey, ItemLoadingStore } from './item-loading.store';

export const QUANTITY_SYNC_DEBOUNCE_MS = 400;

@Injectable({ providedIn: 'root' })
export class CartService {
  private cartItems: CartItem[] = [];
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  cart$ = this.cartSubject.asObservable();

  private cartLoadingSubject = new BehaviorSubject<boolean>(false);
  isCartLoading$ = this.cartLoadingSubject.asObservable();

  private readonly itemLoading = new ItemLoadingStore();
  readonly loading$ = this.itemLoading.keys$;

  /**
   * The last quantity the server acknowledged, per row. A failed sync rolls back to this, not to
   * the value the previous keystroke held — the server never saw that one either.
   */
  private readonly confirmedQuantities = new Map<string, number>();

  private quantityUpdate$ = new Subject<QuantityUpdate>();

  constructor(private cartApi: CartApiService) {
    this.quantityUpdate$
      .pipe(
        // One debounce per row. A single shared debounce dropped row A's update outright when row
        // B was edited inside the window, leaving A showing a quantity the server never received.
        groupBy((update) => update.itemKey),
        mergeMap((row) =>
          row.pipe(
            debounceTime(QUANTITY_SYNC_DEBOUNCE_MS),
            // Within one row the latest edit wins; catchError keeps a failure on one row from
            // tearing down the stream that serves the others
            switchMap((update) => {
              this.itemLoading.start(update.itemKey);
              return this.cartApi.updateItem(update.cartItemId, update.quantity).pipe(
                catchError(() => {
                  this.rollbackQuantity(update.itemKey);
                  return EMPTY;
                }),
              );
            }),
          ),
        ),
      )
      .subscribe((updated) => this.confirmQuantity(updated));
  }

  private keyOf(item: CartItem): string {
    return cartItemKey(item.product.id, item.selectedType?._id);
  }

  private findItem(productId: number, typeId?: string): CartItem | undefined {
    return this.cartItems.find((item) => item.product.id === productId && item.selectedType?._id === typeId);
  }

  private emitCart(): void {
    this.cartSubject.next([...this.cartItems]);
  }

  /** The server accepted this quantity, so it becomes what a later failure rolls back to. */
  private confirmQuantity(updated: CartApiItem): void {
    const item = this.cartItems.find((i) => i.cartItemId === updated.id);
    if (!item) return;
    const key = this.keyOf(item);
    item.quantity = updated.quantity;
    this.confirmedQuantities.set(key, updated.quantity);
    this.itemLoading.finish(key);
    this.emitCart();
  }

  private rollbackQuantity(key: string): void {
    const item = this.cartItems.find((i) => this.keyOf(i) === key);
    const confirmed = this.confirmedQuantities.get(key);
    if (item && confirmed !== undefined) item.quantity = confirmed;
    this.itemLoading.finish(key);
    this.emitCart();
  }

  isItemLoading(productId: number, typeId?: string): boolean {
    return this.itemLoading.has(cartItemKey(productId, typeId));
  }

  fetchCart(): void {
    this.cartLoadingSubject.next(true);
    this.cartApi.getCart().subscribe({
      next: (apiItems) => {
        this.cartItems = apiItems.map(toCartItem);
        this.confirmedQuantities.clear();
        this.cartItems.forEach((item) => this.confirmedQuantities.set(this.keyOf(item), item.quantity));
        this.cartLoadingSubject.next(false);
        this.emitCart();
      },
      error: () => {
        this.cartLoadingSubject.next(false);
      },
    });
  }

  resetCart(): void {
    this.cartItems = [];
    this.confirmedQuantities.clear();
    this.itemLoading.clear();
    this.cartLoadingSubject.next(false);
    this.cartSubject.next([]);
  }

  private addLocally(product: Product, quantity: number, selectedType?: ProductType): CartItem {
    const existing = this.findItem(product.id, selectedType?._id);
    if (existing) {
      existing.quantity += quantity;
      return existing;
    }
    const added: CartItem = {
      product,
      quantity,
      selectedType,
      shopId: product.shopId ?? '',
      shopName: product.shopName ?? '',
    };
    this.cartItems.push(added);
    return added;
  }

  private dropLocally(productId: number, typeId?: string): void {
    this.cartItems = this.cartItems.filter(
      (item) => !(item.product.id === productId && item.selectedType?._id === typeId),
    );
    this.confirmedQuantities.delete(cartItemKey(productId, typeId));
  }

  addToCartLocal(product: Product, quantity: number, selectedType?: ProductType): void {
    this.addLocally(product, quantity, selectedType);
    this.emitCart();
  }

  syncToBackend(product: Product, selectedType?: ProductType): void {
    const key = cartItemKey(product.id, selectedType?._id);
    const item = this.findItem(product.id, selectedType?._id);
    if (!item) return;

    this.itemLoading.start(key);

    if (item.cartItemId) {
      this.cartApi.updateItem(item.cartItemId, item.quantity).subscribe({
        next: (updated) => this.confirmQuantity(updated),
        error: () => this.rollbackQuantity(key),
      });
      return;
    }

    this.cartApi
      .addItem({ productId: product.id, quantity: item.quantity, typeId: selectedType?._id ?? null })
      .subscribe({
        next: (apiItem) => {
          item.cartItemId = apiItem.id;
          item.quantity = apiItem.quantity;
          this.confirmedQuantities.set(key, apiItem.quantity);
          this.itemLoading.finish(key);
          this.emitCart();
        },
        error: () => {
          this.dropLocally(product.id, selectedType?._id);
          this.itemLoading.finish(key);
          this.emitCart();
        },
      });
  }

  addToCart(product: Product, quantity: number, selectedType?: ProductType): void {
    const key = cartItemKey(product.id, selectedType?._id);
    const existed = !!this.findItem(product.id, selectedType?._id);
    this.addLocally(product, quantity, selectedType);
    this.emitCart();

    this.itemLoading.start(key);
    this.cartApi.addItem({ productId: product.id, quantity, typeId: selectedType?._id ?? null }).subscribe({
      next: (apiItem) => {
        const item = this.findItem(product.id, selectedType?._id);
        if (item) {
          item.cartItemId = apiItem.id;
          item.quantity = apiItem.quantity;
          this.confirmedQuantities.set(key, apiItem.quantity);
        }
        this.itemLoading.finish(key);
        this.emitCart();
      },
      error: () => {
        const item = this.findItem(product.id, selectedType?._id);
        if (existed && item) {
          item.quantity -= quantity;
        } else {
          this.dropLocally(product.id, selectedType?._id);
        }
        this.itemLoading.finish(key);
        this.emitCart();
      },
    });
  }

  removeFromCart(productId: number, typeId?: string): void {
    const key = cartItemKey(productId, typeId);
    const item = this.findItem(productId, typeId);
    if (!item) return;

    if (!item.cartItemId) {
      this.dropLocally(productId, typeId);
      this.itemLoading.finish(key);
      this.emitCart();
      return;
    }

    this.itemLoading.start(key);
    this.cartApi.removeItem(item.cartItemId).subscribe({
      next: () => {
        this.dropLocally(productId, typeId);
        this.itemLoading.finish(key);
        this.emitCart();
      },
      error: () => this.itemLoading.finish(key),
    });
  }

  updateQuantity(productId: number, quantity: number, typeId?: string): void {
    const key = cartItemKey(productId, typeId);
    const item = this.findItem(productId, typeId);
    if (!item) return;

    item.quantity = Math.max(1, quantity);
    this.emitCart();

    if (item.cartItemId) {
      this.quantityUpdate$.next({ cartItemId: item.cartItemId, quantity: item.quantity, itemKey: key });
    }
  }

  clearCart(): void {
    this.cartApi.clearCart().subscribe({
      next: () => {
        this.cartItems = [];
        this.confirmedQuantities.clear();
        this.cartSubject.next([]);
      },
    });
  }

  getTotal(): number {
    return this.cartItems.reduce((total, item) => {
      const price = item.selectedType?.price ?? Number(item.product.price);
      return total + price * item.quantity;
    }, 0);
  }

  getCartCount(): number {
    return this.cartItems.reduce((count, item) => count + item.quantity, 0);
  }

  getItems(): CartItem[] {
    return [...this.cartItems];
  }
}
