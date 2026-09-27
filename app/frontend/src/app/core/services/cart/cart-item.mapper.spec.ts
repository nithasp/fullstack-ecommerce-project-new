import { toCartItem } from './cart-item.mapper';
import { CartApiItem } from '../../models/cart-api.model';
import { ProductType } from '../../models/product.model';

describe('toCartItem', () => {
  const type: ProductType = {
    _id: 't1',
    productId: 1,
    color: 'Black',
    quantity: 10,
    price: 79.99,
    stock: 10,
    image: 'type.jpg',
  };

  const full: CartApiItem = {
    id: 10,
    userId: 1,
    productId: 5,
    quantity: 3,
    typeId: 't1',
    selectedType: type,
    shopId: 'shop-row',
    shopName: 'Row Shop',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-02',
    productName: 'Widget',
    productPrice: '79.99',
    productCategory: 'Tools',
    productImage: 'widget.jpg',
    productDescription: 'A widget',
    productPreviewImg: ['a.jpg'],
    productTypes: [type],
    productReviews: [{ star: 5, comment: 'great' }],
    productOverallRating: 4.5,
    productStock: 10,
    productIsActive: true,
    productShopId: 'shop-product',
    productShopName: 'Product Shop',
  };

  it('should rebuild the nested product from the flattened row', () => {
    const item = toCartItem(full);

    expect(item.cartItemId).toBe(10);
    expect(item.quantity).toBe(3);
    expect(item.product.id).toBe(5);
    expect(item.product.name).toBe('Widget');
    expect(item.product.price).toBe('79.99');
    expect(item.product.category).toBe('Tools');
    expect(item.product.previewImg).toEqual(['a.jpg']);
    expect(item.product.overallRating).toBe(4.5);
    expect(item.product.stock).toBe(10);
    expect(item.product.isActive).toBeTrue();
  });

  it('should carry the typed reviews through without a cast', () => {
    const item = toCartItem(full);
    expect(item.product.reviews.length).toBe(1);
    expect(item.product.reviews[0].star).toBe(5);
    expect(item.product.reviews[0].comment).toBe('great');
  });

  it('should keep the selected type when the row has one', () => {
    expect(toCartItem(full).selectedType).toEqual(type);
  });

  it('should prefer the shop on the row over the one on the product', () => {
    const item = toCartItem(full);
    expect(item.shopId).toBe('shop-row');
    expect(item.shopName).toBe('Row Shop');
  });

  it('should fall back to the product shop when the row carries none', () => {
    const item = toCartItem({ ...full, shopId: null, shopName: null });
    expect(item.shopId).toBe('shop-product');
    expect(item.shopName).toBe('Product Shop');
  });

  it('should fill in empty strings for the nullable product fields', () => {
    const item = toCartItem({
      ...full,
      productCategory: null,
      productImage: null,
      productDescription: null,
      productShopId: null,
      productShopName: null,
      selectedType: null,
      shopId: null,
      shopName: null,
    });

    expect(item.product.category).toBe('');
    expect(item.product.image).toBe('');
    expect(item.product.description).toBe('');
    expect(item.product.shopId).toBeUndefined();
    expect(item.selectedType).toBeUndefined();
    expect(item.shopId).toBe('');
    expect(item.shopName).toBe('');
  });
});
