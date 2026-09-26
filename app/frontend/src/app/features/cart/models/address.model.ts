export type AddressLabel = 'home' | 'work' | 'other';

export interface AddressEntry {
  id: number;
  userId?: number;
  fullName: string;
  phone?: string;
  address: string;
  city: string;
  isDefault: boolean;
  label: AddressLabel;
}

export interface AddressForm {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  isDefault: boolean;
  label: AddressLabel;
}

export type AddressDialogMode = 'list' | 'add' | 'edit';
