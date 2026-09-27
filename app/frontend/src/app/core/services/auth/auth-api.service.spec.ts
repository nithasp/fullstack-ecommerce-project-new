import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { AuthApiService } from './auth-api.service';
import { API_BASE_URL } from '../../config/api-config';
import { AuthSession, AuthUser } from '../../models/auth.model';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpMock: HttpTestingController;

  const BASE = 'https://test.local/api/v1';

  const mockUser: AuthUser = {
    id: 1,
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: 'customer',
  };

  const mockSession: AuthSession = { user: mockUser, accessToken: 'token-abc' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthApiService,
        { provide: API_BASE_URL, useValue: BASE },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should resolve its base URL from the injected token', () => {
    service.fetchMe().subscribe();
    httpMock.expectOne(`${BASE}/auth/me`).flush({ status: 200, message: 'ok', data: mockUser });
  });

  it('should POST credentials to /auth/login with the cookie attached', () => {
    let received: AuthSession | undefined;
    service.login('testuser', 'pw').subscribe((session) => (received = session));

    const req = httpMock.expectOne(`${BASE}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'testuser', password: 'pw' });
    expect(req.request.withCredentials).toBeTrue();

    req.flush({ status: 200, message: 'ok', data: mockSession });
    expect(received).toEqual(mockSession);
  });

  it('should POST credentials to /auth/register with the cookie attached', () => {
    service.register('newuser', 'pw').subscribe();

    const req = httpMock.expectOne(`${BASE}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'newuser', password: 'pw' });
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ status: 200, message: 'ok', data: mockSession });
  });

  it('should send the refresh cookie on /auth/refresh', () => {
    let received: AuthSession | undefined;
    service.refresh().subscribe((session) => (received = session));

    const req = httpMock.expectOne(`${BASE}/auth/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();

    req.flush({ status: 200, message: 'ok', data: mockSession });
    expect(received?.accessToken).toBe('token-abc');
  });

  it('should send the refresh cookie on /auth/logout so the server can clear it', () => {
    service.logout().subscribe();

    const req = httpMock.expectOne(`${BASE}/auth/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ status: 200, message: 'ok', data: null });
  });

  it('should not send credentials on /auth/me, which travels on the access token', () => {
    service.fetchMe().subscribe();
    const req = httpMock.expectOne(`${BASE}/auth/me`);
    expect(req.request.withCredentials).toBeFalse();
    req.flush({ status: 200, message: 'ok', data: mockUser });
  });

  it('should unwrap the response envelope', () => {
    let received: AuthUser | undefined;
    service.fetchMe().subscribe((user) => (received = user));
    httpMock.expectOne(`${BASE}/auth/me`).flush({ status: 200, message: 'ok', data: mockUser });
    expect(received).toEqual(mockUser);
  });
});
