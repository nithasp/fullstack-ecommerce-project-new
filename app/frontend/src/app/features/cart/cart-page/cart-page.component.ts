import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { CartItem } from '@core/models/cart.model';
import { CartService } from '@core/services/cart/cart.service';
import { CartApiService } from '@core/services/cart/cart-api.service';
import { NotificationService } from '@core/services/ui/notification.service';
import { AddressApiService } from '../services/address-api.service';
import { AddressEntry } from '../models/address.model';
import { CartRow, PaymentMethod, ShopGroup } from '../models/cart.model';
import { trackById } from '@shared/utils/track-by';

@Component({
  selector: 'app-cart-page',
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPageComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  shopGroups: ShopGroup[] = [];

  isLoadingCart = true;
  isCheckingOut = false;
  selectedKeys = new Set<string>();

  addresses: AddressEntry[] = [];
  selectedAddressId: number | null = null;
  isLoadingAddresses = false;
  isAddressDialogOpen = false;

  selectedPayment = 'visa';
  paymentMethods: PaymentMethod[] = [
    { id: 'visa', name: 'Visa', description: 'Credit / Debit Card', badge: 'VISA', color: '#1a1f71' },
    {
      id: 'mastercard',
      name: 'Mastercard',
      description: 'Credit / Debit Card',
      badge: 'MC',
      color: '#eb001b',
    },
    { id: 'qrcode', name: 'QR Code', description: 'Scan to Pay', badge: 'QR', color: '#6366f1' },
    {
      id: 'bank',
      name: 'Bank Transfer',
      description: 'Direct Bank Transfer',
      badge: 'BANK',
      color: '#059669',
    },
  ];

  discountCode = '';
  appliedDiscount = 0;
  discountLabel = '';
  discountSuccess = '';
  discountError = '';

  // Totals, recomputed whenever the cart, the selection or the discount changes rather than read
  // through getters the template would re-run on every change-detection pass
  selectedCount = 0;
  selectedTotal = 0;
  discountAmount = 0;
  cartTotalAfterDiscount = 0;

  private readonly MOCK_CODES: Record<string, number> = {
    '10%OFF': 0.1,
    SAVE20: 0.2,
  };

  private readonly subscriptions = new Subscription();
  private initializedKeys = new Set<string>();

  constructor(
    public cartService: CartService,
    private cartApi: CartApiService,
    private addressApi: AddressApiService,
    private notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  readonly trackById = trackById;

  trackByRowKey(_index: number, row: CartRow): string {
    return row.key;
  }

  trackByShopId(_index: number, group: ShopGroup): string {
    return group.shopId;
  }

  ngOnInit(): void {
    this.fetchAddresses();

    this.subscriptions.add(
      combineLatest([this.cartService.cart$, this.cartService.isCartLoading$]).subscribe(
        ([items, loading]) => {
          this.isLoadingCart = loading;
          this.cartItems = items;
          items.forEach((item) => {
            const key = this.getItemKey(item);
            if (!this.selectedKeys.has(key) && !this.initializedKeys.has(key)) {
              this.selectedKeys.add(key);
            }
            this.initializedKeys.add(key);
          });
          this.cleanUpRemovedKeys();
          this.rebuildView();
        },
      ),
    );

    // A row's spinner comes from the in-flight set, which changes independently of the cart itself
    this.subscriptions.add(this.cartService.loading$.subscribe(() => this.rebuildView()));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private fetchAddresses(): void {
    this.isLoadingAddresses = true;
    this.addressApi.getAddresses().subscribe({
      next: (list) => {
        this.addresses = list;
        this.isLoadingAddresses = false;
        if (!this.selectedAddressId && list.length > 0) {
          const def = list.find((a) => a.isDefault) ?? list[0];
          this.selectedAddressId = def.id;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingAddresses = false;
        this.cdr.markForCheck();
      },
    });
  }

  onAddressesChange(updated: AddressEntry[]): void {
    this.addresses = updated;
  }

  private cleanUpRemovedKeys(): void {
    const currentKeys = new Set(this.cartItems.map((i) => this.getItemKey(i)));
    for (const key of this.selectedKeys) {
      if (!currentKeys.has(key)) this.selectedKeys.delete(key);
    }
    for (const key of this.initializedKeys) {
      if (!currentKeys.has(key)) this.initializedKeys.delete(key);
    }
  }

  // The cart row has no id of its own until the server gives it one, so the product and the
  // chosen option identify it
  getItemKey(item: CartItem): string {
    return `${item.product.id}_${item.selectedType?._id ?? 'default'}`;
  }

  /** The single place the view is derived from the cart, the selection and the in-flight set. */
  private rebuildView(): void {
    const groups = new Map<string, ShopGroup>();

    for (const item of this.cartItems) {
      const shopId = item.shopId || item.product.shopId || 'unknown';
      const shopName = item.shopName || item.product.shopName || 'Unknown Shop';
      if (!groups.has(shopId)) {
        groups.set(shopId, { shopId, shopName, rows: [], allSelected: false, indeterminate: false });
      }
      groups.get(shopId)!.rows.push(this.toRow(item));
    }

    this.shopGroups = Array.from(groups.values()).map((group) => {
      const selected = group.rows.filter((row) => row.selected).length;
      return {
        ...group,
        allSelected: selected === group.rows.length,
        indeterminate: selected > 0 && selected < group.rows.length,
      };
    });

    this.recomputeTotals();
    this.cdr.markForCheck();
  }

  private toRow(item: CartItem): CartRow {
    const price = item.selectedType?.price ?? Number(item.product.price);
    const stock = item.selectedType?.stock ?? item.product.stock ?? 99;
    return {
      item,
      key: this.getItemKey(item),
      price,
      subtotal: price * item.quantity,
      stock,
      selected: this.selectedKeys.has(this.getItemKey(item)),
      loading: this.cartService.isItemLoading(item.product.id, item.selectedType?._id),
      atStockLimit: item.quantity >= stock,
    };
  }

  private recomputeTotals(): void {
    const selected = this.cartItems.filter((item) => this.selectedKeys.has(this.getItemKey(item)));
    this.selectedCount = selected.reduce((count, item) => count + item.quantity, 0);
    this.selectedTotal = selected.reduce(
      (total, item) => total + (item.selectedType?.price ?? Number(item.product.price)) * item.quantity,
      0,
    );
    this.discountAmount = this.selectedTotal * this.appliedDiscount;
    this.cartTotalAfterDiscount = this.selectedTotal - this.discountAmount;
  }

  private get selectedItems(): CartItem[] {
    return this.cartItems.filter((item) => this.selectedKeys.has(this.getItemKey(item)));
  }

  toggleRow(row: CartRow): void {
    if (this.selectedKeys.has(row.key)) {
      this.selectedKeys.delete(row.key);
    } else {
      this.selectedKeys.add(row.key);
    }
    this.rebuildView();
  }

  toggleShop(group: ShopGroup): void {
    const allSelected = group.allSelected;
    for (const row of group.rows) {
      if (allSelected) {
        this.selectedKeys.delete(row.key);
      } else {
        this.selectedKeys.add(row.key);
      }
    }
    this.rebuildView();
  }

  get selectedAddress(): AddressEntry | undefined {
    return this.addresses.find((a) => a.id === this.selectedAddressId);
  }

  updateQuantity(row: CartRow, quantity: number): void {
    if (quantity > row.stock) {
      this.notificationService.warning(
        `Only ${row.stock} ${row.stock === 1 ? 'item' : 'items'} available in stock. Quantity cannot exceed the available stock.`,
        'Stock Limit Reached',
      );
      return;
    }
    this.cartService.updateQuantity(row.item.product.id, quantity, row.item.selectedType?._id);
  }

  removeRow(row: CartRow): void {
    if (row.loading) return;
    this.cartService.removeFromCart(row.item.product.id, row.item.selectedType?._id);
    this.notificationService.info(`${row.item.product.name} removed from cart`);
  }

  applyDiscount(): void {
    const code = this.discountCode.trim().toUpperCase();
    if (!code) {
      this.discountError = 'Please enter a discount code.';
      this.discountSuccess = '';
      return;
    }
    const discount = this.MOCK_CODES[code];
    if (discount !== undefined) {
      this.appliedDiscount = discount;
      this.discountLabel = code;
      this.discountSuccess = `"${code}" applied — ${discount * 100}% off your order!`;
      this.discountError = '';
    } else {
      this.discountError = 'Invalid code. Try "10%OFF" or "SAVE20".';
      this.discountSuccess = '';
      this.appliedDiscount = 0;
      this.discountLabel = '';
    }
    this.recomputeTotals();
  }

  useHintCode(code: string): void {
    this.discountCode = code;
  }

  removeDiscount(): void {
    this.appliedDiscount = 0;
    this.discountLabel = '';
    this.discountCode = '';
    this.discountSuccess = '';
    this.discountError = '';
    this.recomputeTotals();
  }

  onProceedToCheckout(): void {
    if (this.selectedCount === 0) {
      this.notificationService.error('Please select at least one item to checkout.');
      return;
    }
    if (!this.selectedAddress) {
      this.notificationService.error('Please select a shipping address to continue.');
      this.isAddressDialogOpen = true;
      return;
    }
    if (this.isCheckingOut) return;

    // The server charges for the cart rows themselves, so it is sent their ids, not prices
    const cartItemIds = this.selectedItems
      .map((item) => item.cartItemId)
      .filter((id): id is number => id !== undefined);

    if (cartItemIds.length === 0) {
      this.notificationService.error('Unable to process order. Please refresh and try again.');
      return;
    }

    this.isCheckingOut = true;
    this.cartApi.checkout(cartItemIds, this.selectedAddress.id).subscribe({
      next: () => {
        this.cartService.fetchCart();
        this.isCheckingOut = false;
        this.notificationService.success('Order placed successfully!', 'Thank You');
        this.cdr.markForCheck();
        void this.router.navigate(['/cart/confirmation']);
      },
      error: (err: Error) => {
        this.isCheckingOut = false;
        this.notificationService.error(err?.message || 'Checkout failed. Please try again.');
        this.cdr.markForCheck();
      },
    });
  }
}
