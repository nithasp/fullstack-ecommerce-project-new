import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { NotificationService } from '@core/services/ui/notification.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  // Field-level inject(), because `target: ES2022` initializes class fields before the
  // constructor body runs and `form` reads `fb` as it is declared
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  isLoading = false;

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  onSubmit(): void {
    // A disabled form reports status DISABLED rather than INVALID, so the check below would
    // let a second submit through while the first is still in flight
    if (this.isLoading) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.error('Please fill in all required fields.');
      return;
    }

    this.isLoading = true;
    this.form.disable();

    const { username, password } = this.form.getRawValue();

    this.authService.login(username, password).subscribe({
      next: () => {
        this.notification.success('Login successful! Welcome back.');
        void this.router.navigate(['/products']);
      },
      error: (err: Error) => {
        this.notification.error(err.message || 'Login failed. Please try again.');
        this.isLoading = false;
        this.form.enable();
      },
    });
  }
}
