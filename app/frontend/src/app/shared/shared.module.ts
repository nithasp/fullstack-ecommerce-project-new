import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TruncatePipe } from './pipes/truncate.pipe';
import { IconComponent } from './components/ui/icon/icon.component';
import { LoadingSpinnerComponent } from './components/ui/loading-spinner/loading-spinner.component';
import { NavbarComponent } from './components/ui/navbar/navbar.component';
import { DialogConfirmComponent } from './components/dialog/dialog-confirm/dialog-confirm.component';
import { FocusTrapDirective } from './directives/focus-trap.directive';
import { PortalToBodyDirective } from './directives/portal-to-body.directive';

/**
 * The pieces the eagerly-loaded shell needs. The form controls live in SharedFormsModule instead,
 * because only lazy features use them — keeping them here dragged both forms packages and two
 * component templates into the initial bundle for no one.
 */
@NgModule({
  declarations: [
    TruncatePipe,
    IconComponent,
    LoadingSpinnerComponent,
    NavbarComponent,
    DialogConfirmComponent,
    FocusTrapDirective,
    PortalToBodyDirective,
  ],
  imports: [CommonModule, RouterModule],
  exports: [
    CommonModule,
    RouterModule,
    TruncatePipe,
    IconComponent,
    LoadingSpinnerComponent,
    NavbarComponent,
    DialogConfirmComponent,
    FocusTrapDirective,
    PortalToBodyDirective,
  ],
})
export class SharedModule {}
