import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, EMPTY, filter, mergeMap, Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { QUIET_ERRORS } from '../../interceptors/auth.interceptor';
import { API } from '../../config/api-config';

export interface PageViewReport {
  path: string;
  page?: string;
}

@Injectable({ providedIn: 'root' })
export class PageViewService {
  private readonly baseUrl = `${API.baseUrl}/page-views`;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  trackPageViews(): Subscription {
    return this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      filter(() => this.authService.isLoggedIn),
      mergeMap((event) =>
        this.http
          .post(this.baseUrl, this.reportFor(event.urlAfterRedirects), { context: new HttpContext().set(QUIET_ERRORS, true) })
          .pipe(catchError(() => EMPTY))
      )
    ).subscribe();
  }

  private reportFor(url: string): PageViewReport {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;

    const page: string | undefined = route.data['page'];
    return { path: url.split(/[?#]/)[0], ...(page ? { page } : {}) };
  }
}
