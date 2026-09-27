import { CartItem } from '@core/models/cart.model';

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  badge: string;
  color: string;
}

/**
 * A cart row with everything the template reads already worked out. Under OnPush the view is only
 * rebuilt when the cart, the selection or the in-flight set actually changes, so the price, subtotal
 * and stock checks are computed once per change instead of on every change-detection pass.
 */
export interface CartRow {
  item: CartItem;
  key: string;
  price: number;
  subtotal: number;
  stock: number;
  selected: boolean;
  loading: boolean;
  atStockLimit: boolean;
}

export interface ShopGroup {
  shopId: string;
  shopName: string;
  rows: CartRow[];
  allSelected: boolean;
  indeterminate: boolean;
}
