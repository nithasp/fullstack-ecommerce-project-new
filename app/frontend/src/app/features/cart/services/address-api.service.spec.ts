import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { AddressApiService } from './address-api.service';
import { API_BASE_URL } from '@core/config/api-config';
import { AddressEntry, AddressForm } from '../models/address.model';

describe('AddressApiService', () => {
  let service: AddressApiService;
  let httpMock: HttpTestingController;

  const BASE = 'https://test.local/api/v1';
  const ADDRESSES = `${BASE}/addresses`;

  const entry: AddressEntry = {
    id: 1,
    fullName: 'Test Person',
    address: '1 Test Street',
    city: 'Testville',
    isDefault: true,
    label: 'home',
  };

  const form: AddressForm = {
    fullName: 'Test Person',
    phone: '0100000000',
    address: '1 Test Street',
    city: 'Testville',
    isDefault: true,
    label: 'home',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AddressApiService,
        { provide: API_BASE_URL, useValue: BASE },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AddressApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should GET the address list and unwrap it', () => {
    let received: AddressEntry[] | undefined;
    service.getAddresses().subscribe((list) => (received = list));

    const req = httpMock.expectOne(ADDRESSES);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 200, message: 'ok', data: [entry] });

    expect(received).toEqual([entry]);
  });

  it('should GET a single address by id', () => {
    service.getAddress(1).subscribe();
    const req = httpMock.expectOne(`${ADDRESSES}/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 200, message: 'ok', data: entry });
  });

  it('should POST the whole form when creating', () => {
    service.createAddress(form).subscribe();
    const req = httpMock.expectOne(ADDRESSES);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(form);
    req.flush({ status: 200, message: 'ok', data: entry });
  });

  it('should PATCH only the fields given when updating', () => {
    service.updateAddress(1, { city: 'Elsewhere' }).subscribe();
    const req = httpMock.expectOne(`${ADDRESSES}/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ city: 'Elsewhere' });
    req.flush({ status: 200, message: 'ok', data: { ...entry, city: 'Elsewhere' } });
  });

  it('should DELETE an address by id', () => {
    service.deleteAddress(1).subscribe();
    const req = httpMock.expectOne(`${ADDRESSES}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ status: 200, message: 'ok', data: entry });
  });
});
