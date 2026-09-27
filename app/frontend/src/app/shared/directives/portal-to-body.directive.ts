import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Moves the host element to `document.body` for as long as it is alive, so an overlay is not
 * clipped by an ancestor's `overflow` or trapped under a nearer `z-index`.
 *
 * The element leaves the DOM where Angular put it but stays in the same view, so bindings, events
 * and change detection keep working. This is what it replaces: the same `appendChild` call written
 * by hand in a component's `ngOnInit`, where it read as incidental DOM surgery and had no matching
 * teardown.
 */
@Directive({
  selector: '[appPortalToBody]',
})
export class PortalToBodyDirective implements OnInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  ngOnInit(): void {
    document.body.appendChild(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.host.nativeElement.remove();
  }
}
