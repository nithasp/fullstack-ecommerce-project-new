import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, filter, map, of, switchMap, take } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

/**
 * The mirror image of authGuard: it keeps someone who is already signed in off the login and
 * register pages and drops them on the products page instead. Typing /auth by hand or hitting
 * back after a login would otherwise show the form to a user who has a live session.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Same wait as authGuard: initializeAuth() decides on the first page load whether the
  // refresh cookie still stands up, and that answer has to land before the form is shown.
  return authService.authInitialized$.pipe(
    filter(initialized => initialized),
    take(1),
    switchMap(() => {
      if (authService.hasValidToken()) return of(router.createUrlTree(['/products']));

      // No usable access token. Only spend a /auth/refresh when the cached profile says a
      // session is worth asking about, so a genuinely signed-out visitor reaches the form
      // without paying for a request that is bound to 401.
      if (!authService.getCurrentUser()) return of(true);

      return authService.refreshAccessToken().pipe(
        map(() => router.createUrlTree(['/products'])),
        catchError(() => {
          authService.clearSession();
          return of(true);
        })
      );
    })
  );
};
