import { ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation } from '@angular/core';
import { IconName } from '@core/models/icon.model';

@Component({
  selector: 'app-icon',
  template: '',
  styleUrl: './icon.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  @HostBinding('style.--icon-src')
  source = '';

  @HostBinding('attr.aria-hidden')
  readonly ariaHidden = 'true';

  @Input({ required: true })
  set name(value: IconName) {
    this.source = `url('assets/images/${value}.svg')`;
  }
}
