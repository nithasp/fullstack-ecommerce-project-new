import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BehaviorSubject, of } from 'rxjs';
import { NavbarComponent } from './navbar.component';
import { IconComponent } from '@shared/components/ui/icon/icon.component';
import { CartService } from '@core/services/cart/cart.service';
import { AuthService } from '@core/services/auth/auth.service';
import { NotificationService } from '@core/services/ui/notification.service';
import { AuthUser } from '@core/models/auth.model';
import { Product } from '@core/models/product.model';

const admin: AuthUser = {
  id: 1,
  username: 'boss',
  firstName: 'Big',
  lastName: 'Boss',
  role: 'admin',
};

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let cartService: CartService;

  let isLoggedIn$: BehaviorSubject<boolean>;
  let currentUser$: BehaviorSubject<AuthUser | null>;

  const query = (selector: string): HTMLElement | null => fixture.nativeElement.querySelector(selector);

  beforeEach(async () => {
    isLoggedIn$ = new BehaviorSubject<boolean>(false);
    currentUser$ = new BehaviorSubject<AuthUser | null>(null);

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, CommonModule, HttpClientTestingModule],
      declarations: [NavbarComponent, IconComponent],
      providers: [
        CartService,
        {
          provide: AuthService,
          useValue: {
            isLoggedIn$,
            currentUser$,
            fetchCurrentUser: () => of(null),
            logout: () => {},
          },
        },
        { provide: NotificationService, useValue: { success: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    cartService = TestBed.inject(CartService);
    fixture.detectChanges();
  });

  const signIn = (user: AuthUser | null = null): void => {
    isLoggedIn$.next(true);
    currentUser$.next(user);
    fixture.detectChanges();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have title MyStore', () => {
    expect(component.title).toBe('MyStore');
  });

  it('should render brand name in navbar', () => {
    expect(query('.navbar__brand')?.textContent).toContain('MyStore');
  });

  it('should offer the auth links while signed out', () => {
    expect(query('.navbar__auth-btn--login')).toBeTruthy();
    expect(query('.navbar__cart-link')).toBeFalsy();
  });

  it('should render Products link when logged in', () => {
    signIn();
    const links = Array.from(fixture.nativeElement.querySelectorAll('.navbar__link'));
    const productsLink = links.find((link) => (link as HTMLElement).textContent?.includes('Products'));
    expect(productsLink).toBeTruthy();
  });

  it('should render Cart link with icon when logged in', () => {
    signIn();
    const cartLink = query('.navbar__cart-link');
    expect(cartLink).toBeTruthy();
    expect(cartLink?.querySelector('.navbar__cart-icon')).toBeTruthy();
  });

  it('should show the Activity Log link to admins only', () => {
    signIn(admin);
    expect(query('a[href="/admin/activity"]')).toBeTruthy();

    currentUser$.next({ ...admin, role: 'customer' });
    fixture.detectChanges();
    expect(query('a[href="/admin/activity"]')).toBeFalsy();
  });

  it('should show the signed-in username', () => {
    signIn(admin);
    expect(query('.navbar__username')?.textContent).toContain('boss');
  });

  it('should fall back to a generic name when no profile has arrived', () => {
    signIn(null);
    expect(query('.navbar__username')?.textContent).toContain('User');
  });

  it('should not show badge when cart is empty', () => {
    signIn();
    expect(query('.navbar__badge')).toBeFalsy();
  });

  it('should update cart count when items added', () => {
    const product: Product = {
      id: 1,
      name: 'Test',
      category: 'Test',
      price: '10',
      image: '',
      description: '',
      previewImg: [],
      types: [],
      reviews: [],
      overallRating: 5,
    };

    signIn();
    cartService.addToCartLocal(product, 3);
    fixture.detectChanges();

    expect(query('.navbar__badge')?.textContent).toContain('3');
  });

  it('should fetch a fresh profile when a session begins', () => {
    const authService = TestBed.inject(AuthService);
    spyOn(authService, 'fetchCurrentUser').and.returnValue(of(null as unknown as AuthUser));

    isLoggedIn$.next(true);

    expect(authService.fetchCurrentUser).toHaveBeenCalled();
  });

  it('should close the user menu when the session ends', () => {
    signIn(admin);
    component.toggleUserMenu();
    expect(component.userMenuOpen).toBeTrue();

    isLoggedIn$.next(false);
    expect(component.userMenuOpen).toBeFalse();
  });

  it('should open mobile menu on first toggle', () => {
    expect(component.mobileMenuOpen).toBeFalse();
    component.toggleMobileMenu();
    expect(component.mobileMenuOpen).toBeTrue();
  });

  it('should start closing animation when toggled while open', () => {
    component.mobileMenuOpen = true;
    component.menuClosing = false;
    component.toggleMobileMenu();
    expect(component.menuClosing).toBeTrue();
  });

  it('should set menuClosing flag when closeMobileMenu is called', () => {
    component.mobileMenuOpen = true;
    component.menuClosing = false;
    component.closeMobileMenu();
    expect(component.menuClosing).toBeTrue();
  });
});
