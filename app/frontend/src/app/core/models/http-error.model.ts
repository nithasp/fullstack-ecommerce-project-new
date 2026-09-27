import type { Router } from '@angular/router';
import type { AuthService } from '@core/services/auth/auth.service';
import type { TokenRefreshService } from '@core/services/auth/token-refresh.service';
import type { NotificationService } from '@core/services/ui/notification.service';

/**
 * What the interceptor's error handlers need to do their job. A functional interceptor can only
 * `inject()` inside its own factory, so the collaborators are gathered once there and passed down
 * as a bundle. Imported as types only, which keeps this file out of the runtime graph.
 */
export interface ErrorContext {
  authService: AuthService;
  tokenRefresh: TokenRefreshService;
  router: Router;
  notification: NotificationService;
}
