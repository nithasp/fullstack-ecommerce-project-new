import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinnerComponent {
  @Input() message?: string;

  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  @Input() layout: 'block' | 'inline' = 'block';

  @Input() variant: 'default' | 'light' = 'default';
}
