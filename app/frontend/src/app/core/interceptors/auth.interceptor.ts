import {
  HttpContextToken,
  HttpEvent,
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth/auth.service';
import { TokenRefreshService } from '../services/auth/token-refresh.service';
import { NotificationService } from '../services/ui/notification.service';
import { ErrorContext } from '../models/http-error.model';

export const QUIET_ERRORS = new HttpContextToken<boolean>(() => false);

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

// These carry no access token, and a 401 from one of them is the answer to the credentials sent,
// not a session that went stale
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/demo', '/auth/refresh'];

function isAuthEndpoint(url: string): boolean {
  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

function extractMessage(error: HttpErrorResponse): string {
  return error.error?.message || error.message || 'An unexpected error occurred.';
}

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const context: ErrorContext = {
    authService: inject(AuthService),
    tokenRefresh: inject(TokenRefreshService),
    router: inject(Router),
    notification: inject(NotificationService),
  };

  const token = isAuthEndpoint(req.url) ? null : context.authService.getAccessToken();
  const authReq = token ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => handleError(error, authReq, next, context)),
  );
};

function handleError(
  error: HttpErrorResponse,
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  context: ErrorContext,
): Observable<HttpEvent<unknown>> {
  const { authService, router, notification } = context;

  if (req.context.get(QUIET_ERRORS) && error.error?.code !== 'token_expired') {
    return throwError(() => new Error(extractMessage(error)));
  }

  if (error.status === 0) {
    notification.error('Cannot reach the server. Please check your connection.');
    return throwError(() => new Error('Cannot reach the server.'));
  }

  if (error.status === 401) {
    if (isAuthEndpoint(req.url)) {
      return throwError(() => new Error(extractMessage(error)));
    }
    if (error.error?.code === 'token_expired') {
      return retryWithFreshToken(req, next, context);
    }
    authService.clearSession();
    notification.error('Your session is invalid. Please log in again.');
    void router.navigate(['/auth/login']);
    return throwError(() => new Error(extractMessage(error)));
  }

  if (error.status === 403) {
    notification.error('You do not have permission to perform this action.');
    return throwError(() => new Error(extractMessage(error)));
  }

  if (error.status === 429) {
    notification.error('Too many requests. Please wait a moment and try again.');
    return throwError(() => new Error(extractMessage(error)));
  }

  if (error.status >= 500) {
    notification.error('A server error occurred. Please try again later.');
    return throwError(() => new Error(extractMessage(error)));
  }

  return throwError(() => new Error(extractMessage(error)));
}

function retryWithFreshToken(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  context: ErrorContext,
): Observable<HttpEvent<unknown>> {
  const { authService, tokenRefresh, router, notification } = context;

  return tokenRefresh.freshToken().pipe(
    switchMap((token) => next(addToken(req, token))),
    catchError((err) => {
      authService.clearSession();
      notification.error('Your session has expired. Please log in again.');
      void router.navigate(['/auth/login']);
      return throwError(() => err);
    }),
  );
}
