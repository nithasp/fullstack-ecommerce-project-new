import { ProductType, Review } from './product.model';

export interface CartApiItem {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  typeId: string | null;
  selectedType: ProductType | null;
  shopId: string | null;
  shopName: string | null;
  createdAt: string;
  updatedAt: string;
  productName: string;
  productPrice: string;
  productCategory: string | null;
  productImage: string | null;
  productDescription: string | null;
  productPreviewImg: string[];
  productTypes: ProductType[];
  productReviews: Review[];
  productOverallRating: number;
  productStock: number;
  productIsActive: boolean;
  productShopId: string | null;
  productShopName: string | null;
}

export interface AddCartItemPayload {
  productId: number;
  quantity: number;
  typeId?: string | null;
}

export interface OrderLine {
  id: number;
  orderId: number;
  productId: number;
  typeId: string | null;
  quantity: number;
  unitPrice: string;
}

export interface CheckoutResponse {
  order: { id: number; userId: number; status: string; createdAt: string; total: string };
  items: OrderLine[];
}
