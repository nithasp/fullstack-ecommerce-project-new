import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, filter, map, Observable, of, switchMap, take } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const toLogin = (): Observable<boolean> => {
    authService.clearSession();
    void router.navigate(['/auth/login']);
    return of(false);
  };

  // A visitor with no session of their own is signed in to the shared demo account, so the store
  // opens straight away. The login page is for someone who signed out, or whose demo entry failed.
  const enterAsDemo = (): Observable<boolean> => {
    if (!authService.canEnterAsDemo()) return toLogin();

    return authService.loginAsDemo().pipe(
      map(() => true),
      catchError(() => toLogin()),
    );
  };

  return authService.authInitialized$.pipe(
    filter((initialized) => initialized),
    take(1),
    switchMap(() => {
      if (authService.hasValidToken()) return of(true);
      // No cached profile means there is no session to renew, so the refresh call is skipped
      if (!authService.getCurrentUser()) return enterAsDemo();

      return authService.refreshAccessToken().pipe(
        map(() => true),
        catchError(() => enterAsDemo()),
      );
    }),
  );
};
