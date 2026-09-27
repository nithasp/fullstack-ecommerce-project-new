import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { DialogConfirmComponent } from './dialog-confirm.component';
import { ConfirmDialogService } from '@core/services/ui/confirm-dialog.service';
import { FocusTrapDirective } from '@shared/directives/focus-trap.directive';
import { IconComponent } from '@shared/components/ui/icon/icon.component';

describe('DialogConfirmComponent', () => {
  let component: DialogConfirmComponent;
  let fixture: ComponentFixture<DialogConfirmComponent>;
  let service: ConfirmDialogService;

  const panel = (): HTMLElement => fixture.nativeElement.querySelector('.confirm-dialog');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [DialogConfirmComponent, FocusTrapDirective, IconComponent],
      providers: [ConfirmDialogService],
    }).compileComponents();

    service = TestBed.inject(ConfirmDialogService);
    fixture = TestBed.createComponent(DialogConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function open(danger = false): void {
    service.confirm({ title: 'Delete it', message: 'Are you sure?', danger }).subscribe();
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render nothing until a confirmation is requested', () => {
    expect(fixture.nativeElement.querySelector('.confirm-overlay')).toBeNull();
  });

  it('should render the requested title and message', () => {
    open();
    expect(fixture.nativeElement.querySelector('.confirm-dialog__title').textContent).toContain('Delete it');
    expect(fixture.nativeElement.querySelector('.confirm-dialog__message').textContent).toContain(
      'Are you sure?',
    );
  });

  it('should announce itself as a modal dialog labelled by its own title', () => {
    open();
    expect(panel().getAttribute('role')).toBe('dialog');
    expect(panel().getAttribute('aria-modal')).toBe('true');
    expect(panel().getAttribute('aria-labelledby')).toBe('confirm-dialog-title');
    expect(panel().getAttribute('aria-describedby')).toBe('confirm-dialog-message');

    expect(fixture.nativeElement.querySelector('#confirm-dialog-title')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#confirm-dialog-message')).toBeTruthy();
  });

  it('should resolve true after the closing animation when confirmed', fakeAsync(() => {
    let result: boolean | undefined;
    service.confirm({ title: 't', message: 'm' }).subscribe((r) => (result = r));
    fixture.detectChanges();

    component.confirm();
    expect(component.closing).toBeTrue();
    expect(result).toBeUndefined();

    tick(200);
    expect(result).toBeTrue();
  }));

  it('should resolve false when cancelled', fakeAsync(() => {
    let result: boolean | undefined;
    service.confirm({ title: 't', message: 'm' }).subscribe((r) => (result = r));
    fixture.detectChanges();

    component.cancel();
    tick(200);

    expect(result).toBeFalse();
  }));

  it('should cancel when the backdrop is clicked', fakeAsync(() => {
    let result: boolean | undefined;
    service.confirm({ title: 't', message: 'm' }).subscribe((r) => (result = r));
    fixture.detectChanges();

    component.onOverlayClick();
    tick(200);

    expect(result).toBeFalse();
  }));

  it('should cancel on Escape', fakeAsync(() => {
    let result: boolean | undefined;
    service.confirm({ title: 't', message: 'm' }).subscribe((r) => (result = r));
    fixture.detectChanges();

    component.onEscapeKey();
    tick(200);

    expect(result).toBeFalse();
  }));

  it('should ignore Escape when nothing is open', () => {
    expect(() => component.onEscapeKey()).not.toThrow();
  });

  it('should ignore Escape once it is already closing', fakeAsync(() => {
    const results: boolean[] = [];
    service.confirm({ title: 't', message: 'm' }).subscribe((r) => results.push(r));
    fixture.detectChanges();

    component.cancel();
    component.onEscapeKey();
    tick(400);

    expect(results).toEqual([false]);
  }));

  it('should use the custom button labels when given', () => {
    service.confirm({ title: 't', message: 'm', confirmText: 'Remove', cancelText: 'Keep' }).subscribe();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.confirm-dialog__confirm').textContent).toContain('Remove');
    expect(fixture.nativeElement.querySelector('.confirm-dialog__cancel').textContent).toContain('Keep');
  });

  it('should mark the confirm button as dangerous for a destructive action', () => {
    open(true);
    expect(
      fixture.nativeElement
        .querySelector('.confirm-dialog__confirm')
        .classList.contains('confirm-dialog__confirm--danger'),
    ).toBeTrue();
  });
});
