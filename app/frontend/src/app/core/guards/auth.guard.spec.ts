import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { BehaviorSubject, firstValueFrom, Observable, of, throwError } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth/auth.service';
import { AuthSession, AuthUser } from '../models/auth.model';

describe('authGuard', () => {
  let hasValidToken: boolean;
  let refresh: () => Observable<AuthSession>;
  let clearSession: jasmine.Spy;
  let navigate: jasmine.Spy;
  let authInitialized$: BehaviorSubject<boolean>;

  const user: AuthUser = { id: 1, username: 'someone', firstName: 'Some', lastName: 'One', role: 'customer' };
  const session: AuthSession = { user, accessToken: 'token' };

  const runGuard = (): Promise<boolean> =>
    firstValueFrom(
      TestBed.runInInjectionContext(() =>
        authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      ) as Observable<boolean>,
    );

  beforeEach(() => {
    hasValidToken = false;
    refresh = () => of(session);
    clearSession = jasmine.createSpy('clearSession');
    authInitialized$ = new BehaviorSubject<boolean>(true);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            authInitialized$,
            hasValidToken: () => hasValidToken,
            refreshAccessToken: () => refresh(),
            clearSession: () => clearSession(),
          },
        },
      ],
    });

    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  it('should let a request through on a valid access token', async () => {
    hasValidToken = true;
    expect(await runGuard()).toBeTrue();
  });

  it('should not spend a refresh call when the token is still good', async () => {
    hasValidToken = true;
    const refreshSpy = jasmine.createSpy('refresh').and.returnValue(of(session));
    refresh = refreshSpy;

    await runGuard();

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('should renew an expired token from the refresh cookie and let the request through', async () => {
    const refreshSpy = jasmine.createSpy('refresh').and.returnValue(of(session));
    refresh = refreshSpy;

    expect(await runGuard()).toBeTrue();
    expect(refreshSpy).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should send a visitor to the login page when the refresh cookie is gone', async () => {
    refresh = () => throwError(() => new Error('401'));

    expect(await runGuard()).toBeFalse();
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should drop whatever local session is left when the refresh fails', async () => {
    refresh = () => throwError(() => new Error('401'));

    await runGuard();

    expect(clearSession).toHaveBeenCalled();
  });

  it('should wait for the initial auth check before deciding', async () => {
    authInitialized$ = new BehaviorSubject<boolean>(false);
    hasValidToken = true;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            authInitialized$,
            hasValidToken: () => hasValidToken,
            refreshAccessToken: () => refresh(),
            clearSession: () => clearSession(),
          },
        },
      ],
    });

    let settled = false;
    const result = runGuard().then((value) => {
      settled = true;
      return value;
    });

    expect(settled).toBeFalse();

    authInitialized$.next(true);
    expect(await result).toBeTrue();
  });
});
