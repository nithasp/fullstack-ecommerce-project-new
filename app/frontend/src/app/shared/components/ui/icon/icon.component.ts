import { ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation } from '@angular/core';
import { IconName } from '@core/models/icon.model';

/**
 * Draws one of the SVGs in `public/assets/images` as a CSS mask over `currentColor`, so an icon
 * still picks up the colour of whatever it sits in — a hover state, an active link, the red on the
 * logout row. Rendering the file through an `<img>` instead would bake the colour into the asset.
 *
 * The element sizes the icon, not the file: give the host a width and height (`1em` square by
 * default) and the glyph scales to fit.
 */
@Component({
  selector: 'app-icon',
  template: '',
  styleUrl: './icon.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  /** Set as a custom property so the stylesheet can feed it to both the prefixed and plain mask. */
  @HostBinding('style.--icon-src')
  source = '';

  // Purely presentational: the accessible label always belongs to the element that owns the icon
  @HostBinding('attr.aria-hidden')
  readonly ariaHidden = 'true';

  @Input({ required: true })
  set name(value: IconName) {
    this.source = `url('assets/images/${value}.svg')`;
  }
}
