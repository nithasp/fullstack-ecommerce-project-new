import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Product } from '../../models/product.model';
import { trackByValue } from '@shared/utils/track-by';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  @Input() product!: Product;

  readonly ratingStars: number[] = [1, 2, 3, 4, 5];
  readonly trackByValue = trackByValue;
}
