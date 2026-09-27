import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';
import { IconName } from '@core/models/icon.model';

@Component({
  template: '<app-icon [name]="name"></app-icon>',
})
class HostComponent {
  name: IconName = 'ui/plus';
}

describe('IconComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let icon: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HostComponent, IconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    icon = fixture.nativeElement.querySelector('app-icon');
  });

  it('should point the mask at the named asset', () => {
    expect(icon.style.getPropertyValue('--icon-src')).toBe("url('assets/images/ui/plus.svg')");
  });

  it('should follow the name when it changes', () => {
    host.name = 'ui/eye-off';
    fixture.detectChanges();

    expect(icon.style.getPropertyValue('--icon-src')).toBe("url('assets/images/ui/eye-off.svg')");
  });

  it('should take its colour from the surrounding text', () => {
    icon.style.color = 'rgb(255, 0, 0)';

    expect(getComputedStyle(icon).backgroundColor).toBe('rgb(255, 0, 0)');
  });

  it('should hide itself from assistive technology', () => {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });
});
