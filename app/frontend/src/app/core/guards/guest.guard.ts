import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, filter, map, Observable, of, switchMap, take } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const products = (): UrlTree => router.createUrlTree(['/products']);

  // Unlike authGuard this never clears the session and never navigates: the login page is where a
  // cleared session lands, which would run this guard again without end
  const enterAsDemo = (): Observable<boolean | UrlTree> => {
    if (!authService.canEnterAsDemo()) return of(true);

    return authService.loginAsDemo().pipe(
      map(() => products()),
      catchError(() => of(true)),
    );
  };

  return authService.authInitialized$.pipe(
    filter((initialized) => initialized),
    take(1),
    switchMap(() => {
      if (authService.hasValidToken()) return of(products());
      if (!authService.getCurrentUser()) return enterAsDemo();

      return authService.refreshAccessToken().pipe(
        map(() => products()),
        catchError(() => {
          authService.clearSession();
          return enterAsDemo();
        }),
      );
    }),
  );
};
