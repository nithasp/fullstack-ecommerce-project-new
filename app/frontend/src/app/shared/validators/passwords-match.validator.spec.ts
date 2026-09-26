import { FormControl, FormGroup, Validators } from '@angular/forms';
import { passwordsMatch } from './passwords-match.validator';

describe('passwordsMatch', () => {
  let password: FormControl<string>;
  let confirmPassword: FormControl<string>;
  let group: FormGroup;

  beforeEach(() => {
    password = new FormControl('', { nonNullable: true });
    confirmPassword = new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    });
    group = new FormGroup(
      { password, confirmPassword },
      { validators: passwordsMatch('password', 'confirmPassword') },
    );
  });

  it('should stay quiet while the confirm field is still empty', () => {
    password.setValue('hunter2000');
    expect(group.errors).toBeNull();
    expect(confirmPassword.errors).toEqual({ required: true });
  });

  it('should report a mismatch on the group and the confirm field', () => {
    password.setValue('hunter2000');
    confirmPassword.setValue('hunter2001');

    expect(group.errors).toEqual({ mismatch: true });
    expect(confirmPassword.errors).toEqual({ mismatch: true });
    expect(group.valid).toBeFalse();
  });

  it('should clear the mismatch once the two agree', () => {
    password.setValue('hunter2000');
    confirmPassword.setValue('hunter2001');
    confirmPassword.setValue('hunter2000');

    expect(group.errors).toBeNull();
    expect(confirmPassword.errors).toBeNull();
    expect(group.valid).toBeTrue();
  });

  it('should keep the confirm field own errors alongside a mismatch', () => {
    confirmPassword.addValidators(Validators.minLength(8));
    password.setValue('hunter2000');
    confirmPassword.setValue('short');

    expect(confirmPassword.errors?.['minlength']).toBeTruthy();
    expect(confirmPassword.errors?.['mismatch']).toBeTrue();
  });

  it('should not clobber a required error when the confirm field is emptied again', () => {
    password.setValue('hunter2000');
    confirmPassword.setValue('hunter2000');
    confirmPassword.setValue('');

    expect(confirmPassword.errors).toEqual({ required: true });
  });

  it('should do nothing when a named control is missing', () => {
    const lone = new FormGroup(
      { password: new FormControl('') },
      { validators: passwordsMatch('password', 'confirmPassword') },
    );
    expect(lone.errors).toBeNull();
  });
});
