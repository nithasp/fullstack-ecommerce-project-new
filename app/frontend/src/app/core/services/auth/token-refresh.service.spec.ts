import { TestBed } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';

import { TokenRefreshService } from './token-refresh.service';
import { AuthService } from './auth.service';
import { AuthSession } from '../../models/auth.model';

describe('TokenRefreshService', () => {
  let service: TokenRefreshService;
  let authSpy: jasmine.SpyObj<AuthService>;

  const session = (accessToken: string): AuthSession => ({
    accessToken,
    user: { id: 1, username: 'u', firstName: 'F', lastName: 'L', role: 'customer' },
  });

  beforeEach(() => {
    authSpy = jasmine.createSpyObj('AuthService', ['refreshAccessToken']);
    TestBed.configureTestingModule({
      providers: [TokenRefreshService, { provide: AuthService, useValue: authSpy }],
    });
    service = TestBed.inject(TokenRefreshService);
  });

  it('should emit the refreshed access token', () => {
    const refresh = new Subject<AuthSession>();
    authSpy.refreshAccessToken.and.returnValue(refresh);

    let token: string | undefined;
    service.freshToken().subscribe((t) => (token = t));
    refresh.next(session('fresh-token'));
    refresh.complete();

    expect(token).toBe('fresh-token');
  });

  it('should make one refresh call for concurrent callers', () => {
    const refresh = new Subject<AuthSession>();
    authSpy.refreshAccessToken.and.returnValue(refresh);

    const tokens: string[] = [];
    service.freshToken().subscribe((t) => tokens.push(t));
    service.freshToken().subscribe((t) => tokens.push(t));
    service.freshToken().subscribe((t) => tokens.push(t));

    refresh.next(session('shared-token'));
    refresh.complete();

    expect(authSpy.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(tokens).toEqual(['shared-token', 'shared-token', 'shared-token']);
  });

  it('should fail every waiter when the refresh fails, not just the one that started it', () => {
    const refresh = new Subject<AuthSession>();
    authSpy.refreshAccessToken.and.returnValue(refresh);

    const errors: unknown[] = [];
    let completions = 0;

    service.freshToken().subscribe({ error: (e) => errors.push(e), complete: () => completions++ });
    service.freshToken().subscribe({ error: (e) => errors.push(e), complete: () => completions++ });

    refresh.error(new Error('refresh rejected'));

    // Both callers are told; neither is left hanging on a refresh that will never emit
    expect(errors.length).toBe(2);
    expect(completions).toBe(0);
  });

  it('should start a new attempt after the previous one succeeded', () => {
    const first = new Subject<AuthSession>();
    authSpy.refreshAccessToken.and.returnValue(first);

    service.freshToken().subscribe();
    first.next(session('one'));
    first.complete();

    const second = new Subject<AuthSession>();
    authSpy.refreshAccessToken.and.returnValue(second);

    let token: string | undefined;
    service.freshToken().subscribe((t) => (token = t));
    second.next(session('two'));
    second.complete();

    expect(authSpy.refreshAccessToken).toHaveBeenCalledTimes(2);
    expect(token).toBe('two');
  });

  it('should start a new attempt after the previous one failed', () => {
    authSpy.refreshAccessToken.and.returnValue(throwError(() => new Error('nope')));
    service.freshToken().subscribe({ error: () => undefined });

    const retry = new Subject<AuthSession>();
    authSpy.refreshAccessToken.and.returnValue(retry);

    let token: string | undefined;
    service.freshToken().subscribe((t) => (token = t));
    retry.next(session('recovered'));
    retry.complete();

    expect(authSpy.refreshAccessToken).toHaveBeenCalledTimes(2);
    expect(token).toBe('recovered');
  });

  it('should hold no state across instances', () => {
    authSpy.refreshAccessToken.and.returnValue(throwError(() => new Error('nope')));
    service.freshToken().subscribe({ error: () => undefined });

    // A second injector gets a service that knows nothing about the first one's failed attempt,
    // which is the point of holding this state in a provider rather than at module scope
    const fresh = new TokenRefreshService(authSpy);
    const retry = new Subject<AuthSession>();
    authSpy.refreshAccessToken.and.returnValue(retry);

    let token: string | undefined;
    fresh.freshToken().subscribe((t) => (token = t));
    retry.next(session('independent'));
    retry.complete();

    expect(token).toBe('independent');
  });
});
