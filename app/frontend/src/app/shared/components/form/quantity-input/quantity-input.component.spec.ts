import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { QuantityInputComponent } from './quantity-input.component';

const DEBOUNCE_MS = 700;

describe('QuantityInputComponent', () => {
  let fixture: ComponentFixture<QuantityInputComponent>;
  let component: QuantityInputComponent;
  let written: number[];

  const input = (): HTMLInputElement => fixture.nativeElement.querySelector('.qty-input__field');
  const decreaseBtn = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('.qty-input__btn--decrease');
  const increaseBtn = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('.qty-input__btn--increase');

  const type = (value: string): void => {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const blur = (value: string): void => {
    input().value = value;
    input().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuantityInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QuantityInputComponent);
    component = fixture.componentInstance;

    written = [];
    component.registerOnChange((value) => written.push(value));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start at the minimum', () => {
    expect(component.value).toBe(1);
    expect(component.isAtMin).toBeTrue();
    expect(component.isAtMax).toBeFalse();
  });

  describe('the stepper buttons', () => {
    it('should increase and report the new value at once', () => {
      increaseBtn().click();
      expect(component.value).toBe(2);
      expect(written).toEqual([2]);
    });

    it('should decrease and report the new value at once', () => {
      component.writeValue(5);
      fixture.detectChanges();

      decreaseBtn().click();
      expect(component.value).toBe(4);
      expect(written).toEqual([4]);
    });

    it('should refuse to go below the minimum', () => {
      decreaseBtn().click();
      expect(component.value).toBe(1);
      expect(written).toEqual([]);
    });

    it('should refuse to go above the maximum', () => {
      component.max = 3;
      component.writeValue(3);
      fixture.detectChanges();

      increaseBtn().click();
      expect(component.value).toBe(3);
      expect(written).toEqual([]);
    });

    it('should disable the decrease button at the minimum', () => {
      expect(decreaseBtn().disabled).toBeTrue();
      expect(increaseBtn().disabled).toBeFalse();
    });

    it('should disable the increase button at the maximum', () => {
      component.max = 2;
      component.writeValue(2);
      fixture.detectChanges();
      expect(increaseBtn().disabled).toBeTrue();
    });

    it('should do nothing while disabled', () => {
      component.setDisabledState(true);
      component.increase();
      component.decrease();
      expect(written).toEqual([]);
    });
  });

  describe('typing', () => {
    it('should hold the reported value back until the typing settles', fakeAsync(() => {
      type('7');
      expect(component.value).toBe(7);
      expect(written).toEqual([]);

      tick(DEBOUNCE_MS);
      expect(written).toEqual([7]);
    }));

    it('should report only the last value of a burst', fakeAsync(() => {
      type('2');
      tick(200);
      type('25');
      tick(200);
      type('4');
      tick(DEBOUNCE_MS);

      expect(written).toEqual([4]);
    }));

    it('should correct a value above the maximum as it is typed', fakeAsync(() => {
      type('150');
      expect(component.value).toBe(99);
      expect(input().value).toBe('99');

      tick(DEBOUNCE_MS);
      expect(written).toEqual([99]);
    }));

    it('should ignore text that is not a number', fakeAsync(() => {
      type('abc');
      tick(DEBOUNCE_MS);
      expect(component.value).toBe(1);
      expect(written).toEqual([]);
    }));

    it('should refuse the keys that would make a number it cannot use', () => {
      for (const key of ['e', 'E', '-', '+']) {
        const event = new KeyboardEvent('keydown', { key, cancelable: true });
        input().dispatchEvent(event);
        expect(event.defaultPrevented).withContext(key).toBeTrue();
      }
    });

    it('should let a digit through', () => {
      const event = new KeyboardEvent('keydown', { key: '5', cancelable: true });
      input().dispatchEvent(event);
      expect(event.defaultPrevented).toBeFalse();
    });

    it('should not let an outside update overwrite what is being typed', fakeAsync(() => {
      type('8');
      component.writeValue(3);
      expect(component.value).toBe(8);

      tick(DEBOUNCE_MS);
      component.writeValue(3);
      expect(component.value).toBe(3);
    }));
  });

  describe('blur', () => {
    it('should report the value at once rather than waiting for the debounce', fakeAsync(() => {
      type('6');
      blur('6');

      expect(written).toEqual([6]);
      tick(DEBOUNCE_MS);
      expect(written).toEqual([6]);
    }));

    it('should fall back to the minimum when the field was left empty', () => {
      blur('');
      expect(component.value).toBe(1);
      expect(input().value).toBe('1');
      expect(written).toEqual([1]);
    });

    it('should fall back to the minimum when the field was left below it', () => {
      blur('0');
      expect(component.value).toBe(1);
      expect(written).toEqual([1]);
    });

    it('should clamp a value left above the maximum', () => {
      blur('500');
      expect(component.value).toBe(99);
      expect(written).toEqual([99]);
    });

    it('should mark the control touched', () => {
      const touched = jasmine.createSpy('onTouched');
      component.registerOnTouched(touched);
      blur('2');
      expect(touched).toHaveBeenCalled();
    });
  });

  describe('as a form control', () => {
    it('should take a value from the model', () => {
      component.writeValue(9);
      expect(component.value).toBe(9);
    });

    it('should fall back to the minimum for a null value', () => {
      component.writeValue(null as unknown as number);
      expect(component.value).toBe(1);
    });

    it('should disable the input and both buttons', () => {
      component.setDisabledState(true);
      fixture.detectChanges();
      expect(input().disabled).toBeTrue();
      expect(decreaseBtn().disabled).toBeTrue();
      expect(increaseBtn().disabled).toBeTrue();
    });

    it('should drop a pending debounce when it is destroyed', fakeAsync(() => {
      type('7');
      fixture.destroy();
      tick(DEBOUNCE_MS);
      expect(written).toEqual([]);
    }));
  });
});
