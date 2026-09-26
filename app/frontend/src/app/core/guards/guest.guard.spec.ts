import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { guestGuard } from './guest.guard';
import { AuthService } from '../services/auth/auth.service';
import { AuthSession, AuthUser } from '../models/auth.model';

describe('guestGuard', () => {
  let hasValidToken: boolean;
  let currentUser: AuthUser | null;
  let refresh: () => Observable<AuthSession>;
  let clearSession: jasmine.Spy;

  const user: AuthUser = { id: 1, username: 'someone', firstName: 'Some', lastName: 'One', role: 'customer' };
  const session: AuthSession = { user, accessToken: 'token' };

  const runGuard = (): Promise<boolean | UrlTree> =>
    firstValueFrom(
      TestBed.runInInjectionContext(() =>
        guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      ) as Observable<boolean | UrlTree>,
    );

  const expectRedirectToProducts = async () => {
    const result = await runGuard();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/products');
  };

  beforeEach(() => {
    hasValidToken = false;
    currentUser = null;
    refresh = () => of(session);
    clearSession = jasmine.createSpy('clearSession');

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            authInitialized$: of(true),
            hasValidToken: () => hasValidToken,
            getCurrentUser: () => currentUser,
            refreshAccessToken: () => refresh(),
            clearSession: () => clearSession(),
          },
        },
      ],
    });
  });

  it('should send a signed-in user to the products page', async () => {
    hasValidToken = true;
    currentUser = user;
    await expectRedirectToProducts();
  });

  it('should let a signed-out visitor reach the form', async () => {
    expect(await runGuard()).toBeTrue();
  });

  it('should not spend a refresh call on a visitor with no cached profile', async () => {
    const refreshSpy = jasmine.createSpy('refresh').and.returnValue(of(session));
    refresh = refreshSpy;
    expect(await runGuard()).toBeTrue();
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('should send a user whose access token expired to products once the cookie renews it', async () => {
    currentUser = user;
    await expectRedirectToProducts();
  });

  it('should leave the form open when the refresh cookie is gone', async () => {
    currentUser = user;
    refresh = () => throwError(() => new Error('401'));
    expect(await runGuard()).toBeTrue();
    expect(clearSession).toHaveBeenCalled();
  });
});
