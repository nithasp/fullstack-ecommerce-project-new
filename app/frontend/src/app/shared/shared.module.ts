import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TruncatePipe } from './pipes/truncate.pipe';
import { InputFieldComponent } from './components/form/input-field/input-field.component';
import { QuantityInputComponent } from './components/form/quantity-input/quantity-input.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { DialogConfirmComponent } from './components/dialogs/dialog-confirm/dialog-confirm.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';

@NgModule({
  declarations: [
    TruncatePipe,
    InputFieldComponent,
    QuantityInputComponent,
    NavbarComponent,
    DialogConfirmComponent,
    LoadingSpinnerComponent,
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TruncatePipe,
    InputFieldComponent,
    QuantityInputComponent,
    NavbarComponent,
    DialogConfirmComponent,
    LoadingSpinnerComponent,
  ],
})
export class SharedModule {}
