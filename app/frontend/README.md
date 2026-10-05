# MyStore — Angular Frontend

E-commerce SPA built with Angular 18. Authenticate, browse products, manage a cart, and complete checkout.

## Prerequisites

- Node.js v22+
- Angular CLI v18

## Setup

```bash
npm install
ng serve          # http://localhost:4200
ng test           # Karma + Jasmine (41 spec files, 413 specs)
ng build          # production build
```

## Features

| Area | Description |
|------|-------------|
| **Auth** | Register / Login / Logout. The access token stays in memory and the session lives in an HttpOnly cookie the API sets, so a script on the page cannot read it; the interceptor attaches the token and renews it on a 401. |
| **Guest entry** | A visitor with no session is signed in to the shared demo account by the route guards, so the store opens without a form (`environment.autoDemoLogin`, `POST /auth/demo`). Signing out sets a per-tab flag that holds through refreshes, so the forms stay put; a new tab is a guest again. The login page offers the same entry as **Browse as a guest**. |
| **Products** | Product list and detail pages. Products have type variants (color/price/stock) and reviews. |
| **Cart** | Add/remove items, debounced quantity updates, grouped by shop. Synced to backend REST API. |
| **Checkout** | Address dialog (add/edit/select), order confirmation page. Only the ticked cart rows are sent, by id — the server prices them and reduces stock. |
| **Admin** | Two pages, admins only: **Activity Log** (`/admin/activity`) — who did what and when, filtered by user, type, result and date range, with reads hidden until the checkbox is ticked — and **Page views** (`/admin/page-views`) — the pages people opened, filtered by user, path and date range. |
| **Page views** | `PageViewService` reports each page a signed-in user opens to `POST /page-views`, named by the route's `data.page`. Reports fail quietly (the `QUIET_ERRORS` request flag keeps the interceptor from showing a toast). |
| **Shared** | Navbar, confirm dialog, loading spinner, icon, reusable form controls, `truncate` pipe, toast notifications (`ngx-toastr`). |

## Project Structure

```
src/
├── app/
│   ├── core/                # App-wide singletons; depends on nothing above it
│   │   ├── config/          # API_BASE_URL injection token
│   │   ├── guards/          # Auth, admin and guest route guards
│   │   ├── interceptors/    # Attaches the access token, renews the session on a 401
│   │   ├── models/          # Product, CartItem, AuthUser, ApiResponse, ConfirmDialogConfig
│   │   └── services/
│   │       ├── activity/    # PageViewService (reports the pages people open)
│   │       ├── auth/        # AuthService, AuthApiService, TokenRefreshService
│   │       ├── cart/        # CartService, CartApiService, mapper, loading store
│   │       └── ui/          # NotificationService, ConfirmDialogService
│   ├── features/
│   │   ├── auth/            # Login, Register components (lazy-loaded)
│   │   ├── products/        # ProductList, ProductDetail, ProductCard (lazy-loaded)
│   │   ├── cart/            # CartPage, OrderConfirmation, AddressDialog (lazy-loaded)
│   │   └── admin/           # ActivityLog and PageViews pages, HumanizePipe (lazy-loaded, admins only)
│   └── shared/              # Everything more than one feature draws on
│       ├── components/
│       │   ├── dialog/      # DialogConfirm
│       │   ├── form/        # InputField, QuantityInput
│       │   └── ui/          # Icon, LoadingSpinner, Navbar
│       ├── directives/      # FocusTrap, PortalToBody
│       ├── pipes/           # TruncatePipe
│       ├── shared.module.ts       # What the eager shell needs
│       └── shared-forms.module.ts # The above plus forms; imported by lazy features only
├── environments/            # environment.ts / environment.production.ts
└── styles/                  # SCSS partials (variables, mixins, base, auth, animations)

public/
└── assets/images/           # Icon set as .svg, by category
    ├── commerce/            # cart, store, credit-card, discount-tag
    ├── feedback/            # alert-triangle, info-circle
    ├── illustrations/       # empty-cart, order-success-ring, order-success-check
    ├── nav/                 # grid, activity, login, logout, user, user-plus
    └── ui/                  # check, chevron-down, eye, lock, plus, minus, …
```

### Layering

`core` → `shared` → `features`, and dependencies only ever point left. Every interface lives in a
`*.model.ts`, never beside the service or component that happens to use it first, and shared domain
types (`Product`, `CartItem`) live in `core/models` so that `core` never has to reach into a
feature and no feature has to reach into another. `shared` is grouped by kind rather than by how
much app state a component reads: `Navbar` and `DialogConfirm` sit in `ui/` and `dialog/` alongside
the app-agnostic pieces, and reach app state through `core` services like everything else.

## Key Patterns

- **Lazy-loaded feature modules**: `auth`, `products`, `cart`, `admin`. Only `shared.module` is
  eager; the forms packages ship inside the feature chunks that use them
- **Admin pages**: `adminGuard` hides them from customers; the admin API refuses non-admins on its own
- **Session flow**: `AuthService` keeps the access token in memory → `authInterceptor` attaches it and
  renews from the refresh cookie on a 401 → a reload asks `POST /auth/refresh` for a new one.
  `TokenRefreshService` coordinates that renewal, so a burst of 401s makes one refresh call and every
  waiter shares its outcome
- **Guest entry**: with no session to renew, `authGuard` and `guestGuard` call `POST /auth/demo` and
  carry on to the route that was asked for. Signing out writes a flag to `sessionStorage`, which the
  guards read, so the forms stay put. A browser hands a reopened tab its `sessionStorage` back, so
  `AuthService` clears that flag unless the Navigation Timing entry says the document was reloaded —
  which is what tells a refresh apart from a tab someone just opened. A failed entry is not retried
  by the guards until the page loads again, so falling back to the login page costs one request, not
  two; **Browse as a guest** tries again on demand
- **First load**: `index.html` carries a loader beside `<app-root>`, shown by CSS while `app-root` is
  `:empty`. `AppComponent` renders nothing until auth has initialized and the first navigation has
  settled (a guard redirect or a superseding navigation does not count), so the loader covers the
  demo sign-in and leaves in the same frame the navbar and page arrive in — the navbar never shows
  its signed-out links on the way in. Production builds inline the loader's rules as critical CSS
- **Cart state**: `CartService` fetches/resets on auth state change. Quantity edits are debounced
  **per row** (`groupBy` → `debounceTime` → `switchMap`), so editing two rows inside one window syncs
  both; a rejected edit rolls that row back to the quantity the server last confirmed
- **Form controls**: `InputField` implements `ControlValueAccessor` and takes its required marker and
  error text from the control's own validators; `QuantityInput` clamps and debounces
- **Modals**: `role="dialog"` + `aria-modal`, dismissal on Escape and backdrop, and `appFocusTrap`
  keeps Tab inside and restores focus on close. `appPortalToBody` lifts an overlay out of any
  ancestor that would clip it
- **OnPush** on the list-heavy views. `CartPage` derives a `CartRow` per item so price, subtotal,
  stock and in-flight state are computed when the cart changes, not on every change-detection pass
- **Icons**: every glyph is a file in `public/assets/images`, drawn by `<app-icon name="ui/plus">`
  as a CSS mask over `currentColor`, so an icon still picks up the colour of the hover state, active
  link or button it sits in. `IconName` is a union of the available files, which makes a missing or
  misspelled asset a build error. The two-tone order-confirmation graphic is the exception: a mask
  has no colours to show, so its ring and check are two `<img>` layers the page stages itself —
  a browser renders an `<img>`'s SVG without running the animations inside it
- **BEM + SCSS partials** (`@use`, not the deprecated `@import`) for all component styles
