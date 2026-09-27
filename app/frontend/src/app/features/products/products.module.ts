import { NgModule } from '@angular/core';
import { SharedFormsModule } from '@shared/shared-forms.module';
import { ProductsRoutingModule } from './products-routing.module';
import { ProductListComponent } from './product-list/product-list.component';
import { ProductDetailComponent } from './product-detail/product-detail.component';
import { ProductCardComponent } from './components/product-card/product-card.component';

@NgModule({
  declarations: [ProductListComponent, ProductDetailComponent, ProductCardComponent],
  imports: [SharedFormsModule, ProductsRoutingModule],
})
export class ProductsModule {}
