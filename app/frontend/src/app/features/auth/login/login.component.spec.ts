import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { InputFieldComponent } from '@shared/components/form/input-field/input-field.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { AuthService } from '@core/services/auth/auth.service';
import { NotificationService } from '@core/services/ui/notification.service';
import { AuthSession, AuthUser } from '@core/models/auth.model';

const user: AuthUser = { id: 1, username: 'someone', firstName: 'Some', lastName: 'One', role: 'customer' };
const session: AuthSession = { user, accessToken: 'token' };

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let login: jasmine.Spy;
  let notification: { success: jasmine.Spy; error: jasmine.Spy };
  let navigate: jasmine.Spy;

  const submit = (): void => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  const fillIn = (username: string, password: string): void => {
    component.form.setValue({ username, password });
    fixture.detectChanges();
  };

  beforeEach(async () => {
    login = jasmine.createSpy('login').and.returnValue(of(session));
    notification = {
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error'),
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [LoginComponent, InputFieldComponent, LoadingSpinnerComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { login: (u: string, p: string) => login(u, p) as Observable<AuthSession> },
        },
        { provide: NotificationService, useValue: notification },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with an empty, invalid form', () => {
    expect(component.form.getRawValue()).toEqual({ username: '', password: '' });
    expect(component.form.invalid).toBeTrue();
  });

  it('should require both fields', () => {
    expect(component.form.controls.username.hasError('required')).toBeTrue();
    expect(component.form.controls.password.hasError('required')).toBeTrue();

    fillIn('someone', 'hunter2000');
    expect(component.form.valid).toBeTrue();
  });

  describe('an incomplete form', () => {
    it('should not call the server', () => {
      submit();
      expect(login).not.toHaveBeenCalled();
    });

    it('should tell the user what is wrong', () => {
      submit();
      expect(notification.error).toHaveBeenCalled();
    });

    it('should touch every field so the messages appear', () => {
      expect(component.form.controls.username.touched).toBeFalse();
      submit();
      expect(component.form.controls.username.touched).toBeTrue();
      expect(component.form.controls.password.touched).toBeTrue();
    });

    it('should show the error text under the field', () => {
      submit();
      const messages = fixture.nativeElement.querySelectorAll('.input-field__error-msg');
      expect(messages.length).toBe(2);
    });

    it('should stay off the loading state', () => {
      submit();
      expect(component.isLoading).toBeFalse();
    });
  });

  describe('a completed form', () => {
    beforeEach(() => fillIn('someone', 'hunter2000'));

    it('should send exactly what was typed', () => {
      submit();
      expect(login).toHaveBeenCalledWith('someone', 'hunter2000');
    });

    it('should land on the products page', () => {
      submit();
      expect(navigate).toHaveBeenCalledWith(['/products']);
      expect(notification.success).toHaveBeenCalled();
    });

    it('should disable the form while the request is in flight', () => {
      login.and.returnValue(new Observable<AuthSession>());
      submit();
      expect(component.isLoading).toBeTrue();
      expect(component.form.disabled).toBeTrue();
    });

    it('should not submit twice while a request is in flight', () => {
      login.and.returnValue(new Observable<AuthSession>());
      submit();
      submit();
      expect(login).toHaveBeenCalledTimes(1);
    });
  });

  describe('a rejected sign-in', () => {
    beforeEach(() => {
      fillIn('someone', 'wrong-password');
      login.and.returnValue(throwError(() => new Error('Invalid username or password')));
    });

    it('should report what the server said', () => {
      submit();
      expect(notification.error).toHaveBeenCalledWith('Invalid username or password');
    });

    it('should stay on the page', () => {
      submit();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('should hand the form back so the user can try again', () => {
      submit();
      expect(component.isLoading).toBeFalse();
      expect(component.form.enabled).toBeTrue();
      expect(component.form.getRawValue().username).toBe('someone');
    });

    it('should fall back to a generic message when the error carries none', () => {
      login.and.returnValue(throwError(() => new Error('')));
      submit();
      expect(notification.error).toHaveBeenCalledWith('Login failed. Please try again.');
    });
  });
});
