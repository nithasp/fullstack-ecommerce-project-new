import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, filter, map, of, switchMap, take } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authInitialized$.pipe(
    filter(initialized => initialized),
    take(1),
    switchMap(() => {
      if (authService.hasValidToken()) return of(true);

      return authService.refreshAccessToken().pipe(
        map(() => true),
        catchError(() => {
          authService.clearSession();
          router.navigate(['/auth/login']);
          return of(false);
        })
      );
    })
  );
};
