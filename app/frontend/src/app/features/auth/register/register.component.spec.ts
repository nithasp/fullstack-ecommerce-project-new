import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { RegisterComponent } from './register.component';
import { InputFieldComponent } from '@shared/components/form/input-field/input-field.component';
import { LoadingSpinnerComponent } from '@shared/components/ui/loading-spinner/loading-spinner.component';
import { IconComponent } from '@shared/components/ui/icon/icon.component';
import { AuthService } from '@core/services/auth/auth.service';
import { NotificationService } from '@core/services/ui/notification.service';
import { AuthSession, AuthUser } from '@core/models/auth.model';

const user: AuthUser = { id: 2, username: 'newcomer', firstName: 'New', lastName: 'Comer', role: 'customer' };
const session: AuthSession = { user, accessToken: 'token' };

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let register: jasmine.Spy;
  let notification: { success: jasmine.Spy; error: jasmine.Spy };
  let navigate: jasmine.Spy;

  const submit = (): void => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  const fillIn = (username: string, password: string, confirmPassword = password): void => {
    component.form.setValue({ username, password, confirmPassword });
    fixture.detectChanges();
  };

  beforeEach(async () => {
    register = jasmine.createSpy('register').and.returnValue(of(session));
    notification = {
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error'),
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [RegisterComponent, InputFieldComponent, LoadingSpinnerComponent, IconComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            register: (u: string, p: string) => register(u, p) as Observable<AuthSession>,
          },
        },
        { provide: NotificationService, useValue: notification },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start empty and invalid', () => {
    expect(component.form.getRawValue()).toEqual({ username: '', password: '', confirmPassword: '' });
    expect(component.form.invalid).toBeTrue();
  });

  describe('the rules the form enforces', () => {
    it('should require a username of at least 3 characters', () => {
      component.form.controls.username.setValue('ab');
      expect(component.form.controls.username.hasError('minlength')).toBeTrue();

      component.form.controls.username.setValue('abc');
      expect(component.form.controls.username.valid).toBeTrue();
    });

    it('should require a password of at least 8 characters', () => {
      component.form.controls.password.setValue('short');
      expect(component.form.controls.password.hasError('minlength')).toBeTrue();

      component.form.controls.password.setValue('longenough');
      expect(component.form.controls.password.valid).toBeTrue();
    });

    it('should reach the form, not only the field, when a length rule fails', () => {
      fillIn('ab', 'hunter2000');
      expect(component.form.invalid).toBeTrue();
    });

    it('should report a mismatch on the confirm field', () => {
      fillIn('newcomer', 'hunter2000', 'hunter2001');
      expect(component.form.controls.confirmPassword.hasError('mismatch')).toBeTrue();
      expect(component.form.invalid).toBeTrue();
    });

    it('should clear the mismatch once the two agree', () => {
      fillIn('newcomer', 'hunter2000', 'hunter2001');
      component.form.controls.confirmPassword.setValue('hunter2000');
      expect(component.form.controls.confirmPassword.errors).toBeNull();
      expect(component.form.valid).toBeTrue();
    });

    it('should show the mismatch message under the confirm field', () => {
      fillIn('newcomer', 'hunter2000', 'hunter2001');
      submit();

      const messages = Array.from(fixture.nativeElement.querySelectorAll('.input-field__error-msg')).map(
        (el) => (el as HTMLElement).textContent?.trim(),
      );

      expect(messages).toContain('Passwords do not match');
    });
  });

  describe('an invalid form', () => {
    it('should not call the server for a short username', () => {
      fillIn('ab', 'hunter2000');
      submit();
      expect(register).not.toHaveBeenCalled();
      expect(notification.error).toHaveBeenCalled();
    });

    it('should not call the server for a short password', () => {
      fillIn('newcomer', 'short');
      submit();
      expect(register).not.toHaveBeenCalled();
    });

    it('should not call the server when the passwords disagree', () => {
      fillIn('newcomer', 'hunter2000', 'hunter2001');
      submit();
      expect(register).not.toHaveBeenCalled();
    });

    it('should touch every field so the messages appear', () => {
      submit();
      expect(component.form.controls.username.touched).toBeTrue();
      expect(component.form.controls.password.touched).toBeTrue();
      expect(component.form.controls.confirmPassword.touched).toBeTrue();
    });
  });

  describe('a completed form', () => {
    beforeEach(() => fillIn('newcomer', 'hunter2000'));

    it('should send the username and password, never the confirmation', () => {
      submit();
      expect(register).toHaveBeenCalledWith('newcomer', 'hunter2000');
      expect(register.calls.mostRecent().args.length).toBe(2);
    });

    it('should land on the products page', () => {
      submit();
      expect(navigate).toHaveBeenCalledWith(['/products']);
      expect(notification.success).toHaveBeenCalled();
    });

    it('should disable the form while the request is in flight', () => {
      register.and.returnValue(new Observable<AuthSession>());
      submit();
      expect(component.isLoading).toBeTrue();
      expect(component.form.disabled).toBeTrue();
    });

    it('should not submit twice while a request is in flight', () => {
      register.and.returnValue(new Observable<AuthSession>());
      submit();
      submit();
      expect(register).toHaveBeenCalledTimes(1);
    });
  });

  describe('a rejected registration', () => {
    beforeEach(() => {
      fillIn('taken', 'hunter2000');
      register.and.returnValue(throwError(() => new Error('Username already exists')));
    });

    it('should report what the server said', () => {
      submit();
      expect(notification.error).toHaveBeenCalledWith('Username already exists');
    });

    it('should hand the form back with what was typed', () => {
      submit();
      expect(component.isLoading).toBeFalse();
      expect(component.form.enabled).toBeTrue();
      expect(component.form.getRawValue().username).toBe('taken');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('should fall back to a generic message when the error carries none', () => {
      register.and.returnValue(throwError(() => new Error('')));
      submit();
      expect(notification.error).toHaveBeenCalledWith('Registration failed. Please try again.');
    });
  });
});
