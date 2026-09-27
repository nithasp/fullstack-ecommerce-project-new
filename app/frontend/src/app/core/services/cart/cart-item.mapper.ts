import { Product } from '../../models/product.model';
import { CartItem } from '../../models/cart.model';
import { CartApiItem } from '../../models/cart-api.model';

/**
 * The cart endpoint returns the product flattened onto the row (`productName`, `productPrice`, …),
 * so the nested shape the rest of the app works with is rebuilt here.
 */
export function toCartItem(api: CartApiItem): CartItem {
  const product: Product = {
    id: api.productId,
    name: api.productName ?? '',
    category: api.productCategory ?? '',
    price: api.productPrice ?? '0',
    image: api.productImage ?? '',
    description: api.productDescription ?? '',
    previewImg: api.productPreviewImg ?? [],
    types: api.productTypes ?? [],
    reviews: api.productReviews ?? [],
    overallRating: api.productOverallRating ?? 0,
    stock: api.productStock,
    isActive: api.productIsActive,
    shopId: api.productShopId ?? undefined,
    shopName: api.productShopName ?? undefined,
  };

  return {
    cartItemId: api.id,
    product,
    quantity: api.quantity,
    selectedType: api.selectedType ?? undefined,
    shopId: api.shopId ?? product.shopId ?? '',
    shopName: api.shopName ?? product.shopName ?? '',
  };
}
