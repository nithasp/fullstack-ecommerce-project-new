import { CartItem } from '@core/models/cart.model';

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  badge: string;
  color: string;
}

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
