import { Injectable } from '@angular/core';
import { Observable, finalize, map, shareReplay } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Holds the "one refresh at a time" state that used to live at module scope in the interceptor,
 * where it could not be reset and leaked between TestBed instances.
 */
@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
  private inFlight: Observable<string> | null = null;

  constructor(private authService: AuthService) {}

  /**
   * A burst of 401s makes a single `/auth/refresh` call: the first caller starts it and the rest
   * share the same attempt, so every waiter sees the same success or the same failure. Waiters
   * used to hang forever when the refresh failed, because only the initiator was told.
   */
  freshToken(): Observable<string> {
    this.inFlight ??= this.authService.refreshAccessToken().pipe(
      map((session) => session.accessToken),
      // Clears on both success and failure, so the next 401 starts a fresh attempt
      finalize(() => (this.inFlight = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.inFlight;
  }
}
