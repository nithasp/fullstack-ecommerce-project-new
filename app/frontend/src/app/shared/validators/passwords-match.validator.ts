import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Reports a mismatch on the confirm control itself, so the field that is wrong is the field that
 * shows the message. Only the `mismatch` key is touched, leaving the control's own errors intact.
 */
export function passwordsMatch(passwordKey: string, confirmKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordKey);
    const confirm = group.get(confirmKey);
    if (!password || !confirm) return null;

    const mismatch = !!confirm.value && password.value !== confirm.value;

    const errors = { ...(confirm.errors ?? {}) };
    delete errors['mismatch'];
    if (mismatch) errors['mismatch'] = true;
    confirm.setErrors(Object.keys(errors).length ? errors : null);

    return mismatch ? { mismatch: true } : null;
  };
}
