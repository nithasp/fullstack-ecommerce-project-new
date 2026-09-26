import { Component, Input, Optional, Self } from '@angular/core';
import { ControlValueAccessor, NgControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-input-field',
  templateUrl: './input-field.component.html',
  styleUrl: './input-field.component.scss',
})
export class InputFieldComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() name = '';
  @Input() errorMessages: Record<string, string> = {};

  value = '';
  disabled = false;

  passwordShown = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  // Injecting NgControl while also providing NG_VALUE_ACCESSOR is a dependency cycle, so the
  // accessor registers itself here instead
  constructor(@Self() @Optional() private ngControl: NgControl | null) {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  writeValue(value: string): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(value: string): void {
    this.value = value;
    this.onChange(value);
  }

  onBlur(): void {
    this.onTouched();
  }

  get isPassword(): boolean {
    return this.type === 'password';
  }

  get inputType(): string {
    return this.isPassword && this.passwordShown ? 'text' : this.type;
  }

  togglePassword(): void {
    this.passwordShown = !this.passwordShown;
  }

  // The control carries the rules, so the asterisk follows them instead of a separate input that
  // could disagree with what is actually enforced
  get isRequired(): boolean {
    return !!this.ngControl?.control?.hasValidator(Validators.required);
  }

  // The control decides what failed; this only turns those keys into text
  get errors(): string[] {
    const errors = this.ngControl?.errors;
    if (!errors) return [];
    return Object.keys(errors).map(
      (key) => this.errorMessages[key] ?? this.defaultMessage(key, errors[key] as unknown),
    );
  }

  get showErrors(): boolean {
    return !!this.ngControl?.invalid && !!this.ngControl.touched;
  }

  private defaultMessage(key: string, detail: unknown): string {
    const length = (detail as { requiredLength?: number } | null)?.requiredLength;
    switch (key) {
      case 'required':
        return this.label ? `${this.label} is required` : 'This field is required';
      case 'minlength':
        return `${this.label} must be at least ${length} characters`;
      case 'maxlength':
        return `${this.label} must be at most ${length} characters`;
      case 'email':
        return 'Please enter a valid email';
      case 'pattern':
        return `${this.label} format is invalid`;
      default:
        return `${this.label} is invalid`;
    }
  }
}
