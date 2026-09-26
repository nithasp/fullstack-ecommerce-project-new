import { FormControl } from '@angular/forms';
import { notBlank } from './not-blank.validator';

describe('notBlank', () => {
  it('should reject a value of only spaces', () => {
    expect(notBlank(new FormControl('   '))).toEqual({ required: true });
  });

  it('should reject an empty string', () => {
    expect(notBlank(new FormControl(''))).toEqual({ required: true });
  });

  it('should accept text with content', () => {
    expect(notBlank(new FormControl('Bangkok'))).toBeNull();
  });

  it('should accept text that merely has padding', () => {
    expect(notBlank(new FormControl('  Bangkok  '))).toBeNull();
  });

  it('should leave non-string values to other validators', () => {
    expect(notBlank(new FormControl(null))).toBeNull();
    expect(notBlank(new FormControl(0))).toBeNull();
    expect(notBlank(new FormControl(false))).toBeNull();
  });
});
