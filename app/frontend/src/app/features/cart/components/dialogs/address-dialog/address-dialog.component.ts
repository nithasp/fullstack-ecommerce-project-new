import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AddressDialogMode, AddressEntry, AddressLabel } from '../../../models/address.model';
import { notBlank } from '@shared/validators/not-blank.validator';
import { trackById } from '@shared/utils/track-by';
import { NotificationService } from '@core/services/ui/notification.service';
import { AddressApiService } from '../../../services/address-api.service';
import { ConfirmDialogService } from '@core/services/ui/confirm-dialog.service';

@Component({
  selector: 'app-address-dialog',
  templateUrl: './address-dialog.component.html',
  styleUrl: './address-dialog.component.scss',
})
export class AddressDialogComponent implements OnInit, OnChanges {
  @Input() selectedAddressId: number | null = null;

  @Output() selectedAddressIdChange = new EventEmitter<number | null>();
  @Output() addressesChange = new EventEmitter<AddressEntry[]>();
  @Output() closed = new EventEmitter<void>();

  addresses: AddressEntry[] = [];

  readonly trackById = trackById;
  isLoadingAddresses = false;
  isSaving = false;
  isDeleting = false;

  dialogMode: AddressDialogMode = 'list';
  editingAddressId: number | null = null;
  closing = false;

  // Field-level inject(), because `target: ES2022` initializes class fields before the
  // constructor body runs and `form` reads `fb` as it is declared
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, notBlank]],
    phone: [''],
    address: ['', [Validators.required, notBlank]],
    city: ['', [Validators.required, notBlank]],
    isDefault: [false],
    label: ['home' as AddressLabel],
  });

  localSelectedId: number | null = null;

  constructor(
    private notificationService: NotificationService,
    private addressApi: AddressApiService,
    private confirmDialog: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.loadAddresses();
  }

  // A new selection from the parent means the dialog is showing a different address than the form
  // was opened against, so it drops back to the list rather than keeping a half-edited form
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['selectedAddressId']) return;
    this.localSelectedId = this.selectedAddressId;
    this.backToList();
  }

  private loadAddresses(emitChange = false): void {
    this.isLoadingAddresses = true;
    this.addressApi.getAddresses().subscribe({
      next: (list) => {
        this.addresses = list;
        this.isLoadingAddresses = false;
        if (!this.localSelectedId && list.length > 0) {
          const def = list.find((a) => a.isDefault) ?? list[0];
          this.localSelectedId = def.id;
        }
        if (emitChange) {
          this.addressesChange.emit(list);
        }
      },
      error: () => {
        this.isLoadingAddresses = false;
        this.notificationService.error('Failed to load addresses.');
      },
    });
  }

  openAddMode(): void {
    this.form.reset();
    this.editingAddressId = null;
    this.dialogMode = 'add';
  }

  openEditMode(address: AddressEntry, event: Event): void {
    event.preventDefault();
    this.editingAddressId = address.id;
    this.form.reset({
      fullName: address.fullName,
      phone: address.phone ?? '',
      address: address.address,
      city: address.city,
      isDefault: address.isDefault,
      label: address.label,
    });
    this.dialogMode = 'edit';
  }

  backToList(): void {
    this.form.reset();
    this.editingAddressId = null;
    this.dialogMode = 'list';
  }

  close(): void {
    if (this.closing) return;
    this.closing = true;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.dialogMode === 'list') {
      this.close();
    } else {
      this.backToList();
    }
  }

  onOverlayAnimationDone(event: AnimationEvent): void {
    if (this.closing && event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  confirmSelection(): void {
    this.selectedAddressIdChange.emit(this.localSelectedId);
    this.close();
  }

  onRadioChange(id: number): void {
    this.localSelectedId = id;
  }

  setLabel(label: AddressLabel): void {
    this.form.controls.label.setValue(label);
  }

  promptDelete(address: AddressEntry, event: Event): void {
    event.preventDefault();
    if (this.addresses.length <= 1) {
      this.notificationService.error('You must keep at least one address.');
      return;
    }
    this.confirmDialog
      .confirm({
        title: 'Delete Address',
        message: `Remove "${address.fullName} — ${address.address}, ${address.city}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.isDeleting = true;
        this.addressApi.deleteAddress(address.id).subscribe({
          next: () => {
            this.isDeleting = false;
            if (this.localSelectedId === address.id) {
              const remaining = this.addresses.filter((a) => a.id !== address.id);
              const fallback = remaining.find((a) => a.isDefault) ?? remaining[0];
              this.localSelectedId = fallback?.id ?? null;
            }
            this.notificationService.info('Address removed.');
            this.loadAddresses(true);
          },
          error: () => {
            this.isDeleting = false;
            this.notificationService.error('Failed to delete address. Please try again.');
          },
        });
      });
  }

  saveAddress(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const payload = this.form.getRawValue();

    if (this.dialogMode === 'edit' && this.editingAddressId !== null) {
      this.addressApi.updateAddress(this.editingAddressId, payload).subscribe({
        next: (updated) => {
          this.isSaving = false;
          const idx = this.addresses.findIndex((a) => a.id === this.editingAddressId);
          if (idx !== -1) this.addresses[idx] = updated;
          this.notificationService.success('Address updated!');
          this.backToList();
          this.loadAddresses(true);
        },
        error: () => {
          this.isSaving = false;
          this.notificationService.error('Failed to update address. Please try again.');
        },
      });
    } else {
      this.addressApi.createAddress(payload).subscribe({
        next: (created) => {
          this.isSaving = false;
          this.localSelectedId = created.id;
          this.notificationService.success('New address added!');
          this.backToList();
          this.loadAddresses(true);
        },
        error: () => {
          this.isSaving = false;
          this.notificationService.error('Failed to save address. Please try again.');
        },
      });
    }
  }
}
