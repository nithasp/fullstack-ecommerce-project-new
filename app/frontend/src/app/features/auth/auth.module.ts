import { NgModule } from '@angular/core';

import { AuthRoutingModule } from './auth-routing.module';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { SharedFormsModule } from '@shared/shared-forms.module';

@NgModule({
  declarations: [LoginComponent, RegisterComponent],
  imports: [SharedFormsModule, AuthRoutingModule],
})
export class AuthModule {}
