import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from './shared.module';
import { InputFieldComponent } from './components/form/input-field/input-field.component';
import { QuantityInputComponent } from './components/form/quantity-input/quantity-input.component';

/**
 * Everything SharedModule has, plus the forms packages and the two form controls. Each lazy feature
 * imports this one instead of SharedModule, so the forms code ships in the feature chunks that use
 * it rather than in the initial bundle.
 */
@NgModule({
  declarations: [InputFieldComponent, QuantityInputComponent],
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
  exports: [SharedModule, FormsModule, ReactiveFormsModule, InputFieldComponent, QuantityInputComponent],
})
export class SharedFormsModule {}
