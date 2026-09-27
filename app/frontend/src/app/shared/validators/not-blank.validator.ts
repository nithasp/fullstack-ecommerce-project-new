import { AbstractControl, ValidationErrors } from '@angular/forms';

export function notBlank(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim().length === 0 ? { required: true } : null;
}
