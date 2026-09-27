import type { Router } from '@angular/router';
import type { AuthService } from '@core/services/auth/auth.service';
import type { TokenRefreshService } from '@core/services/auth/token-refresh.service';
import type { NotificationService } from '@core/services/ui/notification.service';

export interface ErrorContext {
  authService: AuthService;
  tokenRefresh: TokenRefreshService;
  router: Router;
  notification: NotificationService;
}
