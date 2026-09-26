import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputFieldComponent } from './input-field.component';

// The component reads its state from the control it is bound to, so the tests drive a real one
@Component({
  template: `
    <form [formGroup]="form">
      <app-input-field
        #field
        name="username"
        [label]="label"
        [type]="type"
        [errorMessages]="errorMessages"
        formControlName="username"
      ></app-input-field>
    </form>
  `,
})
class HostComponent {
  @ViewChild('field') field!: InputFieldComponent;
  label = 'Username';
  type = 'text';
  errorMessages: Record<string, string> = {};
  control = new FormControl('', { nonNullable: true });
  form = new FormGroup({ username: this.control });
}

describe('InputFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let component: InputFieldComponent;

  const query = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector);
  const input = (): HTMLInputElement => query('.input-field__input') as HTMLInputElement;
  const toggle = (): HTMLButtonElement => query('.input-field__toggle') as HTMLButtonElement;
  const errorText = (): string | null => query('.input-field__error-msg')?.textContent ?? null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [InputFieldComponent, HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    component = host.field;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should register itself as the control value accessor', () => {
    host.control.setValue('from the model');
    fixture.detectChanges();
    expect(component.value).toBe('from the model');
    expect(input().value).toBe('from the model');
  });

  it('should write typed text back to the control', () => {
    component.onInput('typed');
    expect(host.control.value).toBe('typed');
  });

  it('should mark the control touched on blur', () => {
    expect(host.control.touched).toBeFalse();
    component.onBlur();
    expect(host.control.touched).toBeTrue();
  });

  it('should handle null in writeValue', () => {
    component.writeValue(null as unknown as string);
    expect(component.value).toBe('');
  });

  it('should disable alongside the control', () => {
    host.control.disable();
    fixture.detectChanges();
    expect(component.disabled).toBeTrue();
    expect(input().disabled).toBeTrue();
  });

  describe('errors', () => {
    it('should report nothing while the control is valid', () => {
      expect(component.errors).toEqual([]);
      expect(component.showErrors).toBeFalse();
    });

    it('should describe a required error from the control', () => {
      host.control.addValidators(Validators.required);
      host.control.updateValueAndValidity();
      host.control.markAsTouched();
      fixture.detectChanges();

      expect(component.errors).toEqual(['Username is required']);
      expect(component.showErrors).toBeTrue();
      expect(errorText()).toContain('Username is required');
    });

    it('should describe a minlength error with the length the control asked for', () => {
      host.control.addValidators(Validators.minLength(5));
      host.control.setValue('Hi');
      host.control.markAsTouched();
      fixture.detectChanges();

      expect(component.errors).toEqual(['Username must be at least 5 characters']);
    });

    it('should describe a maxlength error with the length the control asked for', () => {
      host.control.addValidators(Validators.maxLength(3));
      host.control.setValue('ABCDEF');
      host.control.markAsTouched();
      fixture.detectChanges();

      expect(component.errors).toEqual(['Username must be at most 3 characters']);
    });

    it('should describe a pattern error', () => {
      host.control.addValidators(Validators.pattern('^[0-9]+$'));
      host.control.setValue('abc');
      host.control.markAsTouched();
      fixture.detectChanges();

      expect(component.errors).toEqual(['Username format is invalid']);
    });

    it('should describe an email error', () => {
      host.control.addValidators(Validators.email);
      host.control.setValue('notanemail');
      host.control.markAsTouched();
      fixture.detectChanges();

      expect(component.errors).toEqual(['Please enter a valid email']);
    });

    it('should stay quiet for a valid email', () => {
      host.control.addValidators(Validators.email);
      host.control.setValue('test@example.com');
      host.control.markAsTouched();
      fixture.detectChanges();

      expect(component.errors).toEqual([]);
    });

    it('should prefer a caller-supplied message over the default', () => {
      host.errorMessages = { required: 'Please fill this in' };
      host.control.addValidators(Validators.required);
      host.control.updateValueAndValidity();
      host.control.markAsTouched();
      fixture.detectChanges();

      expect(component.errors).toEqual(['Please fill this in']);
    });

    it('should name a key it has no default for', () => {
      host.control.setErrors({ mismatch: true });
      host.control.markAsTouched();
      fixture.detectChanges();

      expect(component.errors).toEqual(['Username is invalid']);
    });

    it('should hide errors until the control is touched', () => {
      host.control.addValidators(Validators.required);
      host.control.updateValueAndValidity();
      fixture.detectChanges();

      expect(component.errors.length).toBe(1);
      expect(component.showErrors).toBeFalse();
      expect(errorText()).toBeNull();
    });
  });

  describe('required marker', () => {
    it('should stay hidden when the control has no required rule', () => {
      expect(component.isRequired).toBeFalse();
      expect(query('.input-field__required')).toBeNull();
    });

    it('should follow the control rather than a separate input', () => {
      host.control.addValidators(Validators.required);
      host.control.updateValueAndValidity();
      fixture.detectChanges();

      expect(component.isRequired).toBeTrue();
      expect(query('.input-field__required')).toBeTruthy();
    });
  });

  it('should render label in template', () => {
    host.label = 'Test Label';
    fixture.detectChanges();
    expect(query('.input-field__label').textContent).toContain('Test Label');
  });

  describe('password toggle', () => {
    beforeEach(() => {
      host.type = 'password';
      fixture.detectChanges();
    });

    it('should only offer the toggle on a password field', () => {
      expect(toggle()).toBeTruthy();
      host.type = 'text';
      fixture.detectChanges();
      expect(toggle()).toBeNull();
    });

    it('should render the value as text once revealed', () => {
      expect(input().type).toBe('password');
      toggle().click();
      fixture.detectChanges();
      expect(component.passwordShown).toBeTrue();
      expect(input().type).toBe('text');
    });

    it('should mask the value again on a second click', () => {
      toggle().click();
      toggle().click();
      fixture.detectChanges();
      expect(input().type).toBe('password');
    });

    it('should keep type reading password while revealed', () => {
      component.passwordShown = true;
      expect(component.type).toBe('password');
      expect(component.isPassword).toBeTrue();
      expect(component.inputType).toBe('text');
    });

    it('should keep the value across a toggle', () => {
      component.onInput('hunter2');
      toggle().click();
      fixture.detectChanges();
      expect(input().value).toBe('hunter2');
    });

    it('should not submit the surrounding form', () => {
      expect(toggle().type).toBe('button');
    });

    it('should label itself for what the click will do', () => {
      expect(toggle().getAttribute('aria-label')).toBe('Show password');
      expect(toggle().getAttribute('aria-pressed')).toBe('false');

      component.passwordShown = true;
      fixture.detectChanges();
      expect(toggle().getAttribute('aria-label')).toBe('Hide password');
      expect(toggle().getAttribute('aria-pressed')).toBe('true');
    });

    it('should swap the eye for the struck-through eye when revealed', () => {
      expect(query('.input-field__toggle svg line')).toBeNull();
      component.passwordShown = true;
      fixture.detectChanges();
      expect(query('.input-field__toggle svg line')).toBeTruthy();
    });

    it('should disable alongside the input', () => {
      host.control.disable();
      fixture.detectChanges();
      expect(toggle().disabled).toBeTrue();
    });
  });
});
