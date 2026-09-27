import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { PageViewApiService } from './page-view-api.service';
import { API_BASE_URL } from '@core/config/api-config';
import { PageView } from '../models/page-view.model';
import { Page } from '@core/models/api.model';

describe('PageViewApiService', () => {
  let service: PageViewApiService;
  let httpMock: HttpTestingController;

  const BASE = 'https://test.local/api/v1';
  const PAGE_VIEWS = `${BASE}/admin/page-views`;

  const view: PageView = {
    id: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    userId: 5,
    username: 'someone',
    path: '/products',
    page: 'Products',
    ipAddress: '127.0.0.1',
    userAgent: 'test',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PageViewApiService,
        { provide: API_BASE_URL, useValue: BASE },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PageViewApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should always send limit and offset', () => {
    service.getPageViews({ limit: 25, offset: 50 }).subscribe();

    const req = httpMock.expectOne((r) => r.url === PAGE_VIEWS);
    expect(req.request.params.get('limit')).toBe('25');
    expect(req.request.params.get('offset')).toBe('50');
    req.flush({ status: 200, message: 'ok', data: [] });
  });

  it('should omit the optional filters that were not set', () => {
    service.getPageViews({ limit: 25, offset: 0 }).subscribe();

    const req = httpMock.expectOne((r) => r.url === PAGE_VIEWS);
    expect(req.request.params.has('userId')).toBeFalse();
    expect(req.request.params.has('username')).toBeFalse();
    expect(req.request.params.has('path')).toBeFalse();
    expect(req.request.params.has('from')).toBeFalse();
    expect(req.request.params.has('to')).toBeFalse();
    req.flush({ status: 200, message: 'ok', data: [] });
  });

  it('should pass every filter through when set', () => {
    service
      .getPageViews({
        limit: 25,
        offset: 0,
        userId: 5,
        username: 'someone',
        path: '/cart',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
      })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url === PAGE_VIEWS);
    expect(req.request.params.get('userId')).toBe('5');
    expect(req.request.params.get('username')).toBe('someone');
    expect(req.request.params.get('path')).toBe('/cart');
    expect(req.request.params.get('from')).toBe('2026-01-01T00:00:00.000Z');
    expect(req.request.params.get('to')).toBe('2026-01-02T00:00:00.000Z');
    req.flush({ status: 200, message: 'ok', data: [] });
  });

  it('should take the total from the response meta', () => {
    let page: Page<PageView> | undefined;
    service.getPageViews({ limit: 25, offset: 0 }).subscribe((p) => (page = p));

    httpMock
      .expectOne((r) => r.url === PAGE_VIEWS)
      .flush({
        status: 200,
        message: 'ok',
        data: [view],
        meta: { limit: 25, offset: 0, total: 312 },
      });

    expect(page?.items.length).toBe(1);
    expect(page?.total).toBe(312);
  });

  it('should fall back to the row count when the response carries no meta', () => {
    let page: Page<PageView> | undefined;
    service.getPageViews({ limit: 25, offset: 0 }).subscribe((p) => (page = p));

    httpMock.expectOne((r) => r.url === PAGE_VIEWS).flush({ status: 200, message: 'ok', data: [view, view] });

    expect(page?.total).toBe(2);
  });
});
