import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, filter, map, of, switchMap, take } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authInitialized$.pipe(
    filter(initialized => initialized),
    take(1),
    switchMap(() => {
      if (authService.hasValidToken()) return of(router.createUrlTree(['/products']));

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
