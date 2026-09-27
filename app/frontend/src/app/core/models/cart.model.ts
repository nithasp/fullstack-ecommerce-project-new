import { Product, ProductType } from './product.model';

export interface CartItem {
  cartItemId?: number;
  product: Product;
  quantity: number;
  selectedType?: ProductType;
  shopId: string;
  shopName: string;
}

export interface QuantityUpdate {
  cartItemId: number;
  quantity: number;
  itemKey: string;
}
