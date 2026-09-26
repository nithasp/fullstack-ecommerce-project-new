import { AbstractControl, ValidationErrors } from '@angular/forms';

// Validators.required accepts a value of only spaces; the server stores a trimmed name, so a
// blank-but-present field is reported as missing and reuses the `required` message
export function notBlank(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim().length === 0 ? { required: true } : null;
}
