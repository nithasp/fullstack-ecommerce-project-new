import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FocusTrapDirective } from './focus-trap.directive';

@Component({
  template: `
    <button id="outside">Outside</button>
    <div *ngIf="open" appFocusTrap tabindex="-1" id="panel">
      <button id="first">First</button>
      <input id="middle" />
      <button id="last">Last</button>
    </div>
  `,
})
class HostComponent {
  open = true;
}

@Component({
  template: `<div *ngIf="open" appFocusTrap tabindex="-1" id="empty-panel"></div>`,
})
class EmptyHostComponent {
  open = true;
}

describe('FocusTrapDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  const byId = (id: string): HTMLElement => fixture.nativeElement.querySelector(`#${id}`);

  function tab(shift = false): void {
    const panel = byId('panel');
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true });
    panel.dispatchEvent(event);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [FocusTrapDirective, HostComponent, EmptyHostComponent],
    }).compileComponents();
  });

  describe('with focusable content', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(HostComponent);
      // The element has to be in the document for focus() to take effect
      document.body.appendChild(fixture.nativeElement);
      fixture.detectChanges();
    });

    afterEach(() => fixture.nativeElement.remove());

    it('should move focus to the first focusable element on open', () => {
      expect(document.activeElement).toBe(byId('first'));
    });

    it('should wrap from the last element to the first on Tab', () => {
      byId('last').focus();
      tab();
      expect(document.activeElement).toBe(byId('first'));
    });

    it('should wrap from the first element to the last on Shift+Tab', () => {
      byId('first').focus();
      tab(true);
      expect(document.activeElement).toBe(byId('last'));
    });

    it('should leave Tab alone in the middle of the panel', () => {
      byId('middle').focus();
      tab();
      // The browser moves focus itself; the directive only intervenes at the edges
      expect(document.activeElement).toBe(byId('middle'));
    });

    it('should restore focus to where it came from on close', () => {
      const outside = byId('outside');
      outside.focus();

      fixture.componentInstance.open = false;
      fixture.detectChanges();

      expect(document.activeElement).toBe(outside);
    });
  });

  describe('with no focusable content', () => {
    it('should focus the panel itself', () => {
      const empty = TestBed.createComponent(EmptyHostComponent);
      document.body.appendChild(empty.nativeElement);
      empty.detectChanges();

      expect(document.activeElement).toBe(empty.nativeElement.querySelector('#empty-panel'));
      empty.nativeElement.remove();
    });
  });
});
