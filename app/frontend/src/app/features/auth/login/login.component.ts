import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { NotificationService } from '@core/services/ui/notification.service';
import { environment } from '@env/environment';

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

  readonly demoEnabled = environment.autoDemoLogin;

  isLoading = false;
  isDemoLoading = false;

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  onSubmit(): void {
    // A disabled form reports status DISABLED rather than INVALID, so the check below would
    // let a second submit through while the first is still in flight
    if (this.isLoading || this.isDemoLoading) return;

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

  // The same entry the guards take on an untouched tab, offered again to someone who signed out
  enterDemo(): void {
    if (this.isLoading || this.isDemoLoading) return;

    this.isDemoLoading = true;

    this.authService.loginAsDemo().subscribe({
      next: (session) => {
        this.notification.success(`You are browsing as ${session.user.firstName}.`);
        void this.router.navigate(['/products']);
      },
      error: (err: Error) => {
        this.notification.error(err.message || 'The demo is unavailable right now.');
        this.isDemoLoading = false;
      },
    });
  }
}
