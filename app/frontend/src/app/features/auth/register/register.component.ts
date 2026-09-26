import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../core/services/ui/notification.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  username = '';
  password = '';
  confirmPassword = '';
  isLoading = false;
  submitted = false;

  readonly confirmErrorMessages = { required: 'Please confirm your password' };

  constructor(
    private authService: AuthService,
    private notification: NotificationService,
    private router: Router
  ) {}

  get passwordMismatch(): boolean {
    return this.password !== this.confirmPassword && this.confirmPassword.length > 0;
  }

  onSubmit(form: NgForm): void {
    this.submitted = true;

    // app-input-field renders its own messages, and only `required` reaches the NgForm,
    // so the length rules are checked here the way the address dialog checks its own
    if (form.invalid || this.username.length < 3 || this.password.length < 8) {
      this.notification.error('Please fill in all required fields.');
      return;
    }

    if (this.passwordMismatch) {
      this.notification.error('Passwords do not match.');
      return;
    }

    this.isLoading = true;

    this.authService.register(this.username, this.password).subscribe({
      next: () => {
        this.notification.success('Registration successful! Welcome aboard.');
        this.router.navigate(['/products']);
      },
      error: (err: Error) => {
        this.notification.error(err.message || 'Registration failed. Please try again.');
        this.isLoading = false;
      }
    });
  }
}
