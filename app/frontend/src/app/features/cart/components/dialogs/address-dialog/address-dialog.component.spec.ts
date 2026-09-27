import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { AddressDialogComponent } from './address-dialog.component';
import { SharedFormsModule } from '@shared/shared-forms.module';
import { NotificationService } from '@core/services/ui/notification.service';
import { ConfirmDialogService } from '@core/services/ui/confirm-dialog.service';
import { API_BASE_URL } from '@core/config/api-config';
import { AddressEntry } from '../../../models/address.model';

describe('AddressDialogComponent', () => {
  let component: AddressDialogComponent;
  let fixture: ComponentFixture<AddressDialogComponent>;
  let httpMock: HttpTestingController;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let confirmSpy: jasmine.SpyObj<ConfirmDialogService>;

  const BASE = 'https://test.local/api/v1';
  const ADDRESSES = `${BASE}/addresses`;

  const home: AddressEntry = {
    id: 1,
    fullName: 'Home Person',
    address: '1 Home Street',
    city: 'Hometown',
    isDefault: true,
    label: 'home',
  };

  const work: AddressEntry = {
    id: 2,
    fullName: 'Work Person',
    address: '2 Work Road',
    city: 'Worktown',
    isDefault: false,
    label: 'work',
  };

  const overlay = (): HTMLElement | null => document.body.querySelector('.address-dialog-overlay');
  const panel = (): HTMLElement | null => document.body.querySelector('.address-dialog');

  function flushAddresses(list: AddressEntry[] = [home, work]): void {
    httpMock.expectOne(ADDRESSES).flush({ status: 200, message: 'ok', data: list });
    fixture.detectChanges();
  }

  beforeEach(async () => {
    notificationSpy = jasmine.createSpyObj('NotificationService', ['success', 'error', 'info', 'warning']);
    confirmSpy = jasmine.createSpyObj('ConfirmDialogService', ['confirm', 'resolve']);
    confirmSpy.confirm.and.returnValue(of(true));

    await TestBed.configureTestingModule({
      imports: [SharedFormsModule],
      declarations: [AddressDialogComponent],
      providers: [
        { provide: API_BASE_URL, useValue: BASE },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: ConfirmDialogService, useValue: confirmSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AddressDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    overlay()?.remove();
  });

  it('should create and load the address list', () => {
    flushAddresses();
    expect(component).toBeTruthy();
    expect(component.addresses.length).toBe(2);
    expect(component.isLoadingAddresses).toBeFalse();
  });

  it('should move its overlay onto document.body so no ancestor can clip it', () => {
    flushAddresses();
    expect(overlay()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.address-dialog-overlay')).toBeNull();
  });

  it('should remove the portalled overlay when destroyed', () => {
    flushAddresses();
    expect(overlay()).toBeTruthy();

    fixture.destroy();
    expect(overlay()).toBeNull();
  });

  it('should announce itself as a modal dialog labelled by its title', () => {
    flushAddresses();
    expect(panel()?.getAttribute('role')).toBe('dialog');
    expect(panel()?.getAttribute('aria-modal')).toBe('true');
    expect(panel()?.getAttribute('aria-labelledby')).toBe('address-dialog-title');
    expect(document.body.querySelector('#address-dialog-title')).toBeTruthy();
  });

  it('should preselect the default address when the parent gave none', () => {
    flushAddresses();
    expect(component.localSelectedId).toBe(1);
  });

  it('should fall back to the first address when none is marked default', () => {
    flushAddresses([{ ...work, isDefault: false }]);
    expect(component.localSelectedId).toBe(2);
  });

  it('should report a failure to load the list', () => {
    httpMock
      .expectOne(ADDRESSES)
      .flush({ status: 500, message: 'boom', data: null }, { status: 500, statusText: 'Error' });

    expect(component.isLoadingAddresses).toBeFalse();
    expect(notificationSpy.error).toHaveBeenCalledWith('Failed to load addresses.');
  });

  describe('mode switching', () => {
    beforeEach(() => flushAddresses());

    it('should open a blank form in add mode', () => {
      component.openAddMode();
      expect(component.dialogMode).toBe('add');
      expect(component.editingAddressId).toBeNull();
      expect(component.form.controls.fullName.value).toBe('');
    });

    it('should fill the form in edit mode', () => {
      component.openEditMode(work, new Event('click'));

      expect(component.dialogMode).toBe('edit');
      expect(component.editingAddressId).toBe(2);
      expect(component.form.getRawValue()).toEqual({
        fullName: 'Work Person',
        phone: '',
        address: '2 Work Road',
        city: 'Worktown',
        isDefault: false,
        label: 'work',
      });
    });

    it('should clear the form on the way back to the list', () => {
      component.openEditMode(work, new Event('click'));
      component.backToList();

      expect(component.dialogMode).toBe('list');
      expect(component.editingAddressId).toBeNull();
      expect(component.form.controls.fullName.value).toBe('');
    });

    it('should return to the list on Escape while editing, rather than closing', () => {
      component.openEditMode(work, new Event('click'));
      component.onEscapeKey();

      expect(component.dialogMode).toBe('list');
      expect(component.closing).toBeFalse();
    });

    it('should start closing on Escape from the list', () => {
      component.onEscapeKey();
      expect(component.closing).toBeTrue();
    });

    it('should only reset when the selected address input actually changed', () => {
      component.openAddMode();
      component.ngOnChanges({});
      // An unrelated change must not throw away a half-filled form
      expect(component.dialogMode).toBe('add');
    });

    it('should drop back to the list when the selected address changes', () => {
      component.openAddMode();
      component.selectedAddressId = 2;
      component.ngOnChanges({
        selectedAddressId: {
          currentValue: 2,
          previousValue: null,
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(component.dialogMode).toBe('list');
      expect(component.localSelectedId).toBe(2);
    });
  });

  describe('selection', () => {
    beforeEach(() => flushAddresses());

    it('should track the radio choice locally without telling the parent yet', () => {
      const emitted: (number | null)[] = [];
      component.selectedAddressIdChange.subscribe((id) => emitted.push(id));

      component.onRadioChange(2);

      expect(component.localSelectedId).toBe(2);
      expect(emitted).toEqual([]);
    });

    it('should emit the choice and close on confirm', () => {
      const emitted: (number | null)[] = [];
      component.selectedAddressIdChange.subscribe((id) => emitted.push(id));

      component.onRadioChange(2);
      component.confirmSelection();

      expect(emitted).toEqual([2]);
      expect(component.closing).toBeTrue();
    });
  });

  describe('saving', () => {
    beforeEach(() => flushAddresses());

    it('should refuse an invalid form and mark it touched', () => {
      component.openAddMode();
      component.saveAddress();

      expect(component.form.controls.fullName.touched).toBeTrue();
      expect(component.isSaving).toBeFalse();
      httpMock.expectNone((r) => r.method === 'POST');
    });

    it('should reject a name that is only whitespace', () => {
      component.openAddMode();
      component.form.patchValue({ fullName: '   ', address: '1 St', city: 'Town' });

      expect(component.form.controls.fullName.hasError('required')).toBeTrue();
    });

    it('should POST a new address and reload the list', () => {
      const emitted: AddressEntry[][] = [];
      component.addressesChange.subscribe((list) => emitted.push(list));

      component.openAddMode();
      component.form.patchValue({ fullName: 'New Person', address: '3 New Way', city: 'Newtown' });
      component.saveAddress();

      const post = httpMock.expectOne((r) => r.method === 'POST' && r.url === ADDRESSES);
      expect(post.request.body.fullName).toBe('New Person');
      post.flush({ status: 200, message: 'ok', data: { ...home, id: 3, fullName: 'New Person' } });

      expect(component.localSelectedId).toBe(3);
      expect(component.dialogMode).toBe('list');
      expect(notificationSpy.success).toHaveBeenCalledWith('New address added!');

      flushAddresses([home, work, { ...home, id: 3 }]);
      expect(emitted.length).toBe(1);
      expect(emitted[0].length).toBe(3);
    });

    it('should PATCH an edited address', () => {
      component.openEditMode(work, new Event('click'));
      component.form.patchValue({ city: 'Elsewhere' });
      component.saveAddress();

      const patch = httpMock.expectOne((r) => r.method === 'PATCH' && r.url === `${ADDRESSES}/2`);
      expect(patch.request.body.city).toBe('Elsewhere');
      patch.flush({ status: 200, message: 'ok', data: { ...work, city: 'Elsewhere' } });

      expect(notificationSpy.success).toHaveBeenCalledWith('Address updated!');
      expect(component.dialogMode).toBe('list');
      flushAddresses();
    });

    it('should report a failed save and stay on the form', () => {
      component.openAddMode();
      component.form.patchValue({ fullName: 'New Person', address: '3 New Way', city: 'Newtown' });
      component.saveAddress();

      httpMock
        .expectOne((r) => r.method === 'POST')
        .flush({ status: 500, message: 'boom', data: null }, { status: 500, statusText: 'Error' });

      expect(component.isSaving).toBeFalse();
      expect(component.dialogMode).toBe('add');
      expect(notificationSpy.error).toHaveBeenCalledWith('Failed to save address. Please try again.');
    });

    it('should set the label through the form control', () => {
      component.openAddMode();
      component.setLabel('work');
      expect(component.form.controls.label.value).toBe('work');
    });
  });

  describe('deleting', () => {
    it('should refuse to delete the only address', () => {
      flushAddresses([home]);

      component.promptDelete(home, new Event('click'));

      expect(notificationSpy.error).toHaveBeenCalledWith('You must keep at least one address.');
      expect(confirmSpy.confirm).not.toHaveBeenCalled();
    });

    it('should ask before deleting', () => {
      flushAddresses();
      component.promptDelete(work, new Event('click'));

      expect(confirmSpy.confirm).toHaveBeenCalled();
      const config = confirmSpy.confirm.calls.mostRecent().args[0];
      expect(config.danger).toBeTrue();
      expect(config.message).toContain('Work Person');

      httpMock.expectOne(`${ADDRESSES}/2`).flush({ status: 200, message: 'ok', data: work });
      flushAddresses([home]);
    });

    it('should not delete when the confirmation is declined', () => {
      flushAddresses();
      confirmSpy.confirm.and.returnValue(of(false));

      component.promptDelete(work, new Event('click'));

      httpMock.expectNone((r) => r.method === 'DELETE');
      expect(component.isDeleting).toBeFalse();
    });

    it('should pick a new selection when the deleted address was the selected one', () => {
      flushAddresses();
      component.onRadioChange(2);

      component.promptDelete(work, new Event('click'));
      httpMock.expectOne(`${ADDRESSES}/2`).flush({ status: 200, message: 'ok', data: work });

      expect(component.localSelectedId).toBe(1);
      expect(notificationSpy.info).toHaveBeenCalledWith('Address removed.');
      flushAddresses([home]);
    });

    it('should report a failed delete', () => {
      flushAddresses();
      component.promptDelete(work, new Event('click'));

      httpMock
        .expectOne(`${ADDRESSES}/2`)
        .flush({ status: 500, message: 'boom', data: null }, { status: 500, statusText: 'Error' });

      expect(component.isDeleting).toBeFalse();
      expect(notificationSpy.error).toHaveBeenCalledWith('Failed to delete address. Please try again.');
    });
  });
});
