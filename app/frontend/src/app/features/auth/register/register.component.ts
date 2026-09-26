import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { NotificationService } from '@core/services/ui/notification.service';
import { passwordsMatch } from '@shared/validators/passwords-match.validator';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  // Field-level inject(), because `target: ES2022` initializes class fields before the
  // constructor body runs and `form` reads `fb` as it is declared
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  isLoading = false;

  readonly confirmErrorMessages = {
    required: 'Please confirm your password',
    mismatch: 'Passwords do not match',
  };

  readonly form = this.fb.nonNullable.group(
    {
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch('password', 'confirmPassword') },
  );

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

    this.authService.register(username, password).subscribe({
      next: () => {
        this.notification.success('Registration successful! Welcome aboard.');
        void this.router.navigate(['/products']);
      },
      error: (err: Error) => {
        this.notification.error(err.message || 'Registration failed. Please try again.');
        this.isLoading = false;
        this.form.enable();
      },
    });
  }
}
