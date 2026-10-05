import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { AuthService } from './auth.service';
import { AuthApiService } from './auth-api.service';
import { AuthSession } from '../../models/auth.model';

function jwt(expSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp: expSeconds }));
  return `${header}.${payload}.signature`;
}

function base64UrlJwt(expSeconds: number): string {
  const encode = (value: object): string =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  // `~?>>` and `??~` encode to bytes that land on base64 62 and 63, i.e. `+` and `/` before the
  // base64url swap, so the resulting segments genuinely contain `-` and `_`
  const header = encode({ alg: 'HS256', typ: 'JWT', kid: '~?>>' });
  const payload = encode({ exp: expSeconds, iss: '??~' });
  return `${header}.${payload}.signature`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const API = 'http://localhost:3000/api/v1/auth';

  const mockSession: AuthSession = {
    user: {
      id: 1,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'customer',
    },
    accessToken: jwt(9999999999),
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [AuthService, AuthApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('register', () => {
    it('should POST to /auth/register and start a session', () => {
      service.register('testuser', 'password123').subscribe((res) => {
        expect(res.user.username).toBe('testuser');
        expect(res.accessToken).toBeDefined();
      });

      const req = httpMock.expectOne(`${API}/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        username: 'testuser',
        password: 'password123',
      });
      expect(req.request.withCredentials).toBeTrue();

      req.flush({ status: 200, message: 'ok', data: mockSession });

      expect(service.getAccessToken()).toBe(mockSession.accessToken);
      expect(service.getCurrentUser()?.username).toBe('testuser');
    });

    it('should emit isLoggedIn$ = true after successful register', () => {
      let loggedIn = false;
      service.isLoggedIn$.subscribe((val) => (loggedIn = val));

      service.register('u', 'p').subscribe();
      httpMock.expectOne(`${API}/register`).flush({ status: 200, message: 'ok', data: mockSession });

      expect(loggedIn).toBeTrue();
    });

    it('should propagate error from backend on failure', () => {
      let errorReceived = false;
      service.register('existing', 'pass').subscribe({
        error: () => (errorReceived = true),
      });

      httpMock
        .expectOne(`${API}/register`)
        .flush(
          { status: 409, message: 'Username already exists', data: null, code: 'conflict' },
          { status: 409, statusText: 'Conflict' },
        );

      expect(errorReceived).toBeTrue();
    });
  });

  describe('login', () => {
    it('should POST to /auth/login and keep the access token in memory only', () => {
      service.login('testuser', 'password123').subscribe((res) => {
        expect(res.user.username).toBe('testuser');
      });

      const req = httpMock.expectOne(`${API}/login`);
      expect(req.request.method).toBe('POST');
      req.flush({ status: 200, message: 'ok', data: mockSession });

      expect(service.getAccessToken()).toBe(mockSession.accessToken);
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('should emit isLoggedIn$ = true after successful login', () => {
      let loggedIn = false;
      service.isLoggedIn$.subscribe((val) => (loggedIn = val));

      service.login('u', 'p').subscribe();
      httpMock.expectOne(`${API}/login`).flush({ status: 200, message: 'ok', data: mockSession });

      expect(loggedIn).toBeTrue();
    });

    it('should propagate error from backend on invalid credentials', () => {
      let errorReceived = false;
      service.login('bad', 'creds').subscribe({
        error: () => (errorReceived = true),
      });

      httpMock
        .expectOne(`${API}/login`)
        .flush(
          { status: 401, message: 'Invalid username or password', data: null, code: 'invalid_credentials' },
          { status: 401, statusText: 'Unauthorized' },
        );

      expect(errorReceived).toBeTrue();
    });
  });

  describe('token helpers', () => {
    it('hasValidToken should return false before a session starts', () => {
      expect(service.hasValidToken()).toBeFalse();
    });

    it('hasValidToken should return true for a non-expired JWT', () => {
      service.login('u', 'p').subscribe();
      httpMock.expectOne(`${API}/login`).flush({ status: 200, message: 'ok', data: mockSession });

      expect(service.hasValidToken()).toBeTrue();
    });

    it('hasValidToken should return false for an expired JWT', () => {
      service.login('u', 'p').subscribe();
      httpMock
        .expectOne(`${API}/login`)
        .flush({ status: 200, message: 'ok', data: { ...mockSession, accessToken: jwt(1000000000) } });

      expect(service.hasValidToken()).toBeFalse();
    });

    it('hasValidToken should accept a base64url payload containing - and _', () => {
      // A real JWT is base64url, so its segments can hold `-` and `_`. `atob` rejects both, and the
      // throw was swallowed as "invalid" — a live token read as expired and forced a refresh.
      const token = base64UrlJwt(9999999999);
      expect(token).toMatch(/[-_]/);

      service.login('u', 'p').subscribe();
      httpMock
        .expectOne(`${API}/login`)
        .flush({ status: 200, message: 'ok', data: { ...mockSession, accessToken: token } });

      expect(service.hasValidToken()).toBeTrue();
    });

    it('hasValidToken should return false for a token that is not three segments', () => {
      service.login('u', 'p').subscribe();
      httpMock
        .expectOne(`${API}/login`)
        .flush({ status: 200, message: 'ok', data: { ...mockSession, accessToken: 'not.ajwt' } });

      expect(service.hasValidToken()).toBeFalse();
    });

    it('hasValidToken should return false when the payload carries no exp', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ sub: 'nobody' }));

      service.login('u', 'p').subscribe();
      httpMock.expectOne(`${API}/login`).flush({
        status: 200,
        message: 'ok',
        data: { ...mockSession, accessToken: `${header}.${payload}.sig` },
      });

      expect(service.hasValidToken()).toBeFalse();
    });
  });

  describe('initializeAuth', () => {
    it('should not ask the server when no session was cached', () => {
      let settled = false;
      service.initializeAuth().subscribe(() => (settled = true));

      httpMock.expectNone(`${API}/refresh`);
      expect(settled).toBeTrue();
      expect(service.isLoggedIn).toBeFalse();
    });

    it('should renew the session from the cookie when a profile was cached', () => {
      localStorage.setItem('currentUser', JSON.stringify(mockSession.user));

      service.initializeAuth().subscribe();
      const req = httpMock.expectOne(`${API}/refresh`);
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ status: 200, message: 'ok', data: mockSession });

      expect(service.isLoggedIn).toBeTrue();
      expect(service.getAccessToken()).toBe(mockSession.accessToken);
    });

    it('should sign out when the cookie is gone', () => {
      localStorage.setItem('currentUser', JSON.stringify(mockSession.user));

      service.initializeAuth().subscribe();
      httpMock
        .expectOne(`${API}/refresh`)
        .flush(
          { status: 401, message: 'Invalid or expired refresh token', data: null, code: 'token_invalid' },
          { status: 401, statusText: 'Unauthorized' },
        );

      expect(service.isLoggedIn).toBeFalse();
      expect(localStorage.getItem('currentUser')).toBeNull();
    });
  });

  describe('refreshAccessToken', () => {
    it('should POST an empty body and update the token it holds', () => {
      service.refreshAccessToken().subscribe((res) => {
        expect(res.accessToken).toBe(mockSession.accessToken);
      });

      const req = httpMock.expectOne(`${API}/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      expect(req.request.withCredentials).toBeTrue();

      req.flush({ status: 200, message: 'ok', data: mockSession });

      expect(service.getAccessToken()).toBe(mockSession.accessToken);
    });

    it('should propagate the error when the session is rejected', () => {
      let errorReceived = false;
      service.refreshAccessToken().subscribe({
        error: () => (errorReceived = true),
      });

      httpMock
        .expectOne(`${API}/refresh`)
        .flush(
          { status: 401, message: 'Invalid or expired refresh token', data: null, code: 'token_invalid' },
          { status: 401, statusText: 'Unauthorized' },
        );

      expect(errorReceived).toBeTrue();
    });
  });

  describe('logout', () => {
    it('should tell the server and drop everything it holds', () => {
      service.login('u', 'p').subscribe();
      httpMock.expectOne(`${API}/login`).flush({ status: 200, message: 'ok', data: mockSession });

      service.logout();

      const req = httpMock.expectOne(`${API}/logout`);
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ status: 200, message: 'ok', data: null });

      expect(service.getAccessToken()).toBeNull();
      expect(localStorage.getItem('currentUser')).toBeNull();
    });

    it('should emit isLoggedIn$ = false after logout', () => {
      let loggedIn = true;
      service.isLoggedIn$.subscribe((val) => (loggedIn = val));

      service.logout();
      httpMock.expectOne(`${API}/logout`).flush({ status: 200, message: 'ok', data: null });

      expect(loggedIn).toBeFalse();
    });
  });

  describe('demo entry', () => {
    // A tab is "fresh" unless the browser says the document was reloaded, which is what keeps a
    // sign-out from being undone by a refresh
    const asNavigation = (type: 'navigate' | 'reload'): void => {
      spyOn(performance, 'getEntriesByType').and.returnValue([{ type } as unknown as PerformanceEntry]);
    };

    const signOut = (): void => {
      service.logout();
      httpMock.expectOne(`${API}/logout`).flush({ status: 200, message: 'ok', data: null });
    };

    it('should POST an empty body to /auth/demo and start a session', () => {
      service.loginAsDemo().subscribe((res) => {
        expect(res.user.username).toBe('testuser');
      });

      const req = httpMock.expectOne(`${API}/demo`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      expect(req.request.withCredentials).toBeTrue();

      req.flush({ status: 200, message: 'ok', data: mockSession });

      expect(service.isLoggedIn).toBeTrue();
      expect(service.getAccessToken()).toBe(mockSession.accessToken);
    });

    it('should propagate the error when the demo account is unavailable', () => {
      let errorReceived = false;
      service.loginAsDemo().subscribe({ error: () => (errorReceived = true) });

      httpMock
        .expectOne(`${API}/demo`)
        .flush(
          { status: 404, message: 'Demo access is not available', data: null, code: 'not_found' },
          { status: 404, statusText: 'Not Found' },
        );

      expect(errorReceived).toBeTrue();
      expect(service.isLoggedIn).toBeFalse();
    });

    it('should be open in a tab nobody has signed out of', () => {
      expect(service.canEnterAsDemo()).toBeTrue();
    });

    it('should close for the rest of the tab once someone signs out', () => {
      signOut();
      expect(service.canEnterAsDemo()).toBeFalse();
    });

    it('should stay closed when the page is reloaded', () => {
      signOut();

      asNavigation('reload');
      const reloaded = new AuthService(TestBed.inject(AuthApiService));

      expect(reloaded.canEnterAsDemo()).toBeFalse();
    });

    it('should open again in a tab that was opened rather than reloaded', () => {
      signOut();

      // A browser hands a reopened or restored tab its sessionStorage back, so the refusal is
      // still there and only the navigation type tells the two apart
      asNavigation('navigate');
      const opened = new AuthService(TestBed.inject(AuthApiService));

      expect(opened.canEnterAsDemo()).toBeTrue();
    });

    it('should open again once a real account signs in', () => {
      signOut();

      service.login('u', 'p').subscribe();
      httpMock.expectOne(`${API}/login`).flush({ status: 200, message: 'ok', data: mockSession });

      expect(service.canEnterAsDemo()).toBeTrue();
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when no user is stored', () => {
      expect(service.getCurrentUser()).toBeNull();
    });

    it('should return the stored user after successful login', () => {
      service.login('testuser', 'pass').subscribe();
      httpMock.expectOne(`${API}/login`).flush({ status: 200, message: 'ok', data: mockSession });

      const user = service.getCurrentUser();
      expect(user?.username).toBe('testuser');
    });
  });
});
