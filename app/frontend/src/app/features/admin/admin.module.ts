import { NgModule } from '@angular/core';
import { SharedFormsModule } from '@shared/shared-forms.module';
import { AdminRoutingModule } from './admin-routing.module';
import { ActivityLogComponent } from './activity-log/activity-log.component';
import { PageViewsComponent } from './page-views/page-views.component';
import { HumanizePipe } from './pipes/humanize.pipe';

@NgModule({
  declarations: [ActivityLogComponent, PageViewsComponent, HumanizePipe],
  imports: [SharedFormsModule, AdminRoutingModule],
})
export class AdminModule {}
