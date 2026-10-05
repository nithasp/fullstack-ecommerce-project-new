import { Component, OnInit } from '@angular/core';
import {
  Event,
  NavigationCancel,
  NavigationCancellationCode,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  Router,
} from '@angular/router';
import { filter, forkJoin, take } from 'rxjs';
import { AuthService } from '@core/services/auth/auth.service';
import { CartService } from '@core/services/cart/cart.service';
import { PageViewService } from '@core/services/activity/page-view.service';

/**
 * True once the router has stopped navigating. A cancel for a redirect, or for a newer navigation
 * such as the guards sending a failed demo entry to the login page, hands over to the next one.
 */
function settlesNavigation(event: Event): boolean {
  if (event instanceof NavigationCancel) {
    return (
      event.code !== NavigationCancellationCode.Redirect &&
      event.code !== NavigationCancellationCode.SupersededByNewNavigation
    );
  }
  return (
    event instanceof NavigationEnd || event instanceof NavigationError || event instanceof NavigationSkipped
  );
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'MyStore';
  appReady = false;

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private pageViewService: PageViewService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // A new visitor is signed in to the demo by the guards on the way to the first page, so the
    // navbar waits for that page: shown any sooner, it offers Login and Register until the demo
    // session arrives. Until then this renders nothing, and the loader from index.html shows.
    forkJoin([
      this.authService.initializeAuth(),
      this.router.events.pipe(filter(settlesNavigation), take(1)),
    ]).subscribe(() => {
      this.appReady = true;
    });

    this.pageViewService.trackPageViews();

    this.authService.isLoggedIn$.subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        this.cartService.fetchCart();
      } else {
        this.cartService.resetCart();
      }
    });
  }
}
