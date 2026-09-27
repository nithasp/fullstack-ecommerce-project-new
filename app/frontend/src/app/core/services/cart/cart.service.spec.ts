import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CartService, QUANTITY_SYNC_DEBOUNCE_MS } from './cart.service';
import { Product, ProductType } from '@core/models/product.model';
import { CartApiItem } from '@core/models/cart-api.model';

describe('CartService', () => {
  let service: CartService;
  let httpMock: HttpTestingController;

  const API = 'http://localhost:3000/api/v1';

  const mockType: ProductType = {
    _id: 'type1',
    productId: 1001,
    color: 'Black',
    quantity: 50,
    price: 79.99,
    stock: 50,
    image: 'https://example.com/img.jpg',
  };

  const mockProduct: Product = {
    id: 1,
    name: 'Test Product',
    category: 'Electronics',
    price: '79.99',
    image: 'https://example.com/img.jpg',
    description: 'A test product',
    previewImg: ['https://example.com/img.jpg'],
    types: [mockType],
    reviews: [],
    overallRating: 4.5,
  };

  const mockProduct2: Product = {
    ...mockProduct,
    id: 2,
    name: 'Test Product 2',
    price: '49.99',
  };

  const apiRow: CartApiItem = {
    id: 10,
    userId: 1,
    productId: 1,
    quantity: 1,
    typeId: 'type1',
    selectedType: mockType,
    shopId: null,
    shopName: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    productName: 'Test Product',
    productPrice: '79.99',
    productCategory: 'Electronics',
    productImage: 'https://example.com/img.jpg',
    productDescription: 'A test product',
    productPreviewImg: [],
    productTypes: [mockType],
    productReviews: [],
    productOverallRating: 4.5,
    productStock: 50,
    productIsActive: true,
    productShopId: null,
    productShopName: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(CartService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with an empty cart', () => {
    expect(service.getItems().length).toBe(0);
    expect(service.getTotal()).toBe(0);
    expect(service.getCartCount()).toBe(0);
  });

  it('should add a product to the cart', () => {
    service.addToCartLocal(mockProduct, 2, mockType);
    const items = service.getItems();
    expect(items.length).toBe(1);
    expect(items[0].product.id).toBe(1);
    expect(items[0].quantity).toBe(2);
  });

  it('should increment quantity when adding the same product', () => {
    service.addToCartLocal(mockProduct, 1, mockType);
    service.addToCartLocal(mockProduct, 3, mockType);
    const items = service.getItems();
    expect(items.length).toBe(1);
    expect(items[0].quantity).toBe(4);
  });

  it('should add different products as separate items', () => {
    service.addToCartLocal(mockProduct, 1, mockType);
    service.addToCartLocal(mockProduct2, 2);
    const items = service.getItems();
    expect(items.length).toBe(2);
  });

  it('should calculate total correctly', () => {
    service.addToCartLocal(mockProduct, 2, mockType);
    expect(service.getTotal()).toBeCloseTo(159.98, 2);
  });

  it('should calculate total for multiple products', () => {
    service.addToCartLocal(mockProduct, 1, mockType);
    service.addToCartLocal(mockProduct2, 2);
    expect(service.getTotal()).toBeCloseTo(79.99 + 2 * 49.99, 2);
  });

  it('should return correct cart count', () => {
    service.addToCartLocal(mockProduct, 3, mockType);
    service.addToCartLocal(mockProduct2, 2);
    expect(service.getCartCount()).toBe(5);
  });

  it('should remove a product from the cart', () => {
    service.addToCartLocal(mockProduct, 1, mockType);
    service.addToCartLocal(mockProduct2, 1);
    service.removeFromCart(1, 'type1');
    const items = service.getItems();
    expect(items.length).toBe(1);
    expect(items[0].product.id).toBe(2);
  });

  it('should update quantity of a product', () => {
    service.addToCartLocal(mockProduct, 1, mockType);
    service.updateQuantity(1, 5, 'type1');
    expect(service.getItems()[0].quantity).toBe(5);
  });

  it('should not allow quantity below 1', () => {
    service.addToCartLocal(mockProduct, 3, mockType);
    service.updateQuantity(1, 0, 'type1');
    expect(service.getItems()[0].quantity).toBe(1);
  });

  it('should clear the cart', () => {
    service.addToCartLocal(mockProduct, 1, mockType);
    service.addToCartLocal(mockProduct2, 2);
    service.resetCart();
    expect(service.getItems().length).toBe(0);
    expect(service.getTotal()).toBe(0);
    expect(service.getCartCount()).toBe(0);
  });

  it('should emit cart changes via observable', (done) => {
    let emitCount = 0;
    service.cart$.subscribe((items) => {
      emitCount++;
      if (emitCount === 2) {
        expect(items.length).toBe(1);
        done();
      }
    });
    service.addToCartLocal(mockProduct, 1, mockType);
  });

  describe('debounced quantity sync', () => {
    /** Puts two rows in the cart already carrying server ids, as a fetched cart would. */
    function seedTwoSyncedRows(): void {
      service.fetchCart();
      httpMock.expectOne(`${API}/cart`).flush({
        status: 200,
        message: 'ok',
        data: [
          { ...apiRow, id: 10, productId: 1, typeId: 'type1', selectedType: mockType, quantity: 1 },
          { ...apiRow, id: 11, productId: 2, typeId: null, selectedType: null, quantity: 1 },
        ],
      });
    }

    it('should send an update for each row edited inside one debounce window', fakeAsync(() => {
      seedTwoSyncedRows();

      service.updateQuantity(1, 4, 'type1');
      tick(100);
      service.updateQuantity(2, 7);
      tick(QUANTITY_SYNC_DEBOUNCE_MS + 50);

      // A single shared debounce kept only the last emission, so row 10's PATCH was never sent
      // while its quantity had already been changed on screen
      const requests = httpMock.match((r) => r.method === 'PATCH');
      expect(requests.length).toBe(2);
      expect(requests.map((r) => r.request.url).sort()).toEqual([`${API}/cart/10`, `${API}/cart/11`]);
      expect(requests.find((r) => r.request.url.endsWith('/10'))!.request.body).toEqual({ quantity: 4 });
      expect(requests.find((r) => r.request.url.endsWith('/11'))!.request.body).toEqual({ quantity: 7 });

      requests.forEach((r) => r.flush({ status: 200, message: 'ok', data: { ...apiRow, id: 10 } }));
      flush();
    }));

    it('should collapse repeated edits to one row into a single request', fakeAsync(() => {
      seedTwoSyncedRows();

      service.updateQuantity(1, 2, 'type1');
      tick(100);
      service.updateQuantity(1, 3, 'type1');
      tick(100);
      service.updateQuantity(1, 4, 'type1');
      tick(QUANTITY_SYNC_DEBOUNCE_MS + 50);

      const requests = httpMock.match((r) => r.method === 'PATCH');
      expect(requests.length).toBe(1);
      expect(requests[0].request.body).toEqual({ quantity: 4 });

      requests[0].flush({ status: 200, message: 'ok', data: { ...apiRow, id: 10, quantity: 4 } });
      flush();
    }));

    it('should roll a failed row back to the quantity the server last confirmed', fakeAsync(() => {
      seedTwoSyncedRows();

      service.updateQuantity(1, 2, 'type1');
      tick(100);
      service.updateQuantity(1, 9, 'type1');
      tick(QUANTITY_SYNC_DEBOUNCE_MS + 50);

      httpMock
        .expectOne(`${API}/cart/10`)
        .flush({ status: 500, message: 'boom', data: null }, { status: 500, statusText: 'Error' });
      flush();

      // Back to 1 — the fetched value — not to 2, which the server never saw either
      expect(service.getItems().find((i) => i.product.id === 1)!.quantity).toBe(1);
      expect(service.isItemLoading(1, 'type1')).toBeFalse();
    }));

    it('should keep syncing other rows after one row fails', fakeAsync(() => {
      seedTwoSyncedRows();

      service.updateQuantity(1, 5, 'type1');
      tick(QUANTITY_SYNC_DEBOUNCE_MS + 50);
      httpMock
        .expectOne(`${API}/cart/10`)
        .flush({ status: 500, message: 'boom', data: null }, { status: 500, statusText: 'Error' });
      flush();

      service.updateQuantity(2, 6);
      tick(QUANTITY_SYNC_DEBOUNCE_MS + 50);

      // catchError on the inner request keeps the outer stream alive; a failure used to tear it down
      const retry = httpMock.expectOne(`${API}/cart/11`);
      expect(retry.request.body).toEqual({ quantity: 6 });
      retry.flush({ status: 200, message: 'ok', data: { ...apiRow, id: 11, quantity: 6 } });
      flush();
    }));

    it('should clear only the failed row from the in-flight set', fakeAsync(() => {
      seedTwoSyncedRows();

      service.updateQuantity(1, 3, 'type1');
      service.updateQuantity(2, 3);
      tick(QUANTITY_SYNC_DEBOUNCE_MS + 50);

      const failing = httpMock.expectOne(`${API}/cart/10`);
      const succeeding = httpMock.expectOne(`${API}/cart/11`);

      failing.flush({ status: 500, message: 'boom', data: null }, { status: 500, statusText: 'Error' });
      expect(service.isItemLoading(1, 'type1')).toBeFalse();
      // The other row is still in flight; the error handler used to clear every key at once
      expect(service.isItemLoading(2)).toBeTrue();

      succeeding.flush({ status: 200, message: 'ok', data: { ...apiRow, id: 11, quantity: 3 } });
      expect(service.isItemLoading(2)).toBeFalse();
      flush();
    }));
  });
});
