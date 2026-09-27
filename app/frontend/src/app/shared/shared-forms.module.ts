import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from './shared.module';
import { InputFieldComponent } from './components/form/input-field/input-field.component';
import { QuantityInputComponent } from './components/form/quantity-input/quantity-input.component';

@NgModule({
  declarations: [InputFieldComponent, QuantityInputComponent],
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
  exports: [SharedModule, FormsModule, ReactiveFormsModule, InputFieldComponent, QuantityInputComponent],
})
export class SharedFormsModule {}
