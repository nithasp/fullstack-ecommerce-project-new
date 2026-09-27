/**
 * Every icon in `public/assets/images`, named `<category>/<file>` without the extension. The union
 * is what makes `<app-icon name="…">` a compile-time check under strictTemplates: a typo or a
 * deleted file fails the build instead of silently rendering nothing.
 */
export type IconName =
  // Navigation and account
  | 'nav/activity'
  | 'nav/grid'
  | 'nav/login'
  | 'nav/logout'
  | 'nav/user'
  | 'nav/user-plus'
  // Generic controls
  | 'ui/arrow-left'
  | 'ui/check'
  | 'ui/chevron-down'
  | 'ui/eye'
  | 'ui/eye-off'
  | 'ui/location-pin'
  | 'ui/lock'
  | 'ui/minus'
  | 'ui/plus'
  // Shop, cart and payment
  | 'commerce/cart'
  | 'commerce/credit-card'
  | 'commerce/discount-tag'
  | 'commerce/store'
  // Confirmation dialog states
  | 'feedback/alert-triangle'
  | 'feedback/info-circle'
  // Large decorative graphics
  | 'illustrations/empty-cart';
