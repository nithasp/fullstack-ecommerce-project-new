import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { CartApiService } from './cart-api.service';
import { API_BASE_URL } from '../../config/api-config';
import { CartApiItem } from '../../models/cart-api.model';

describe('CartApiService', () => {
  let service: CartApiService;
  let httpMock: HttpTestingController;

  const BASE = 'https://test.local/api/v1';
  const CART = `${BASE}/cart`;

  const mockItem = { id: 10, productId: 1, quantity: 2 } as CartApiItem;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CartApiService,
        { provide: API_BASE_URL, useValue: BASE },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CartApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should GET the cart and unwrap the envelope', () => {
    let received: CartApiItem[] | undefined;
    service.getCart().subscribe((items) => (received = items));

    const req = httpMock.expectOne(CART);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 200, message: 'ok', data: [mockItem] });

    expect(received?.length).toBe(1);
    expect(received?.[0].id).toBe(10);
  });

  it('should POST a new row with its payload', () => {
    service.addItem({ productId: 1, quantity: 2, typeId: 't1' }).subscribe();

    const req = httpMock.expectOne(CART);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ productId: 1, quantity: 2, typeId: 't1' });
    req.flush({ status: 200, message: 'ok', data: mockItem });
  });

  it('should PATCH only the quantity when updating a row', () => {
    service.updateItem(10, 5).subscribe();

    const req = httpMock.expectOne(`${CART}/10`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ quantity: 5 });
    req.flush({ status: 200, message: 'ok', data: { ...mockItem, quantity: 5 } });
  });

  it('should DELETE a single row by its id', () => {
    service.removeItem(10).subscribe();

    const req = httpMock.expectOne(`${CART}/10`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ status: 200, message: 'ok', data: mockItem });
  });

  it('should DELETE the collection when clearing the cart', () => {
    service.clearCart().subscribe();

    const req = httpMock.expectOne(CART);
    expect(req.request.method).toBe('DELETE');
    req.flush({ status: 200, message: 'ok', data: null });
  });

  it('should send row ids and an address id to checkout, never prices', () => {
    service.checkout([10, 11], 7).subscribe();

    const req = httpMock.expectOne(`${CART}/checkout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ cartItemIds: [10, 11], addressId: 7 });
    expect(JSON.stringify(req.request.body)).not.toContain('price');

    req.flush({
      status: 200,
      message: 'ok',
      data: {
        order: { id: 1, userId: 1, status: 'paid', createdAt: '2026-01-01', total: '159.98' },
        items: [],
      },
    });
  });
});
