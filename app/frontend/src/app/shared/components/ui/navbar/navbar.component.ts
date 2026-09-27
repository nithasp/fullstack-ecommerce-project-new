import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map, skip, startWith } from 'rxjs/operators';
import { CartService } from '@core/services/cart/cart.service';
import { AuthService } from '@core/services/auth/auth.service';
import { AuthUser } from '@core/models/auth.model';
import { NotificationService } from '@core/services/ui/notification.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements OnInit, OnDestroy {
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly elRef = inject(ElementRef);

  title = 'MyStore';
  mobileMenuOpen = false;
  menuClosing = false;
  userMenuOpen = false;

  readonly isLoggedIn$: Observable<boolean> = this.authService.isLoggedIn$;
  readonly currentUser$: Observable<AuthUser | null> = this.authService.currentUser$;
  readonly displayName$: Observable<string> = this.currentUser$.pipe(map((user) => user?.username ?? 'User'));

  readonly isAdmin$: Observable<boolean> = this.currentUser$.pipe(map((user) => user?.role === 'admin'));

  readonly cartCount$: Observable<number> = this.cartService.cart$.pipe(
    map(() => this.cartService.getCartCount()),
    startWith(this.cartService.getCartCount()),
  );

  private authSub!: Subscription;

  ngOnInit(): void {
    this.authSub = this.authService.isLoggedIn$
      .pipe(distinctUntilChanged(), skip(1))
      .subscribe((loggedIn) => {
        if (!loggedIn) {
          this.userMenuOpen = false;
        } else {
          this.authService.fetchCurrentUser().subscribe({ error: () => {} });
        }
      });
  }

  ngOnDestroy(): void {
    this.authSub.unsubscribe();
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.notification.success('You have been logged out.');
    this.closeMobileMenu();
    this.closeUserMenu();
    void this.router.navigate(['/auth/login']);
  }

  toggleMobileMenu(): void {
    if (this.mobileMenuOpen) {
      this.closeMobileMenu();
    } else {
      this.menuClosing = false;
      this.mobileMenuOpen = true;
    }
  }

  closeMobileMenu(): void {
    if (!this.mobileMenuOpen || this.menuClosing) return;
    this.menuClosing = true;
    this.closeUserMenu();
  }

  onMenuAnimationDone(event: AnimationEvent): void {
    if (this.menuClosing && event.target === event.currentTarget) {
      this.mobileMenuOpen = false;
      this.menuClosing = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      if (this.mobileMenuOpen) this.closeMobileMenu();
      if (this.userMenuOpen) this.closeUserMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.mobileMenuOpen) this.closeMobileMenu();
    if (this.userMenuOpen) this.closeUserMenu();
  }
}
