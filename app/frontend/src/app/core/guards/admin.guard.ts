import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

/**
 * Decides what the app shows; the admin API refuses anyone who is not an admin on its own,
 * whatever the browser holds.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authInitialized$.pipe(
    filter(initialized => initialized),
    take(1),
    map(() => {
      const user = authService.getCurrentUser();
      if (!user) return false;
      return user.role === 'admin' ? true : router.createUrlTree(['/products']);
    })
  );
};
