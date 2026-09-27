import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { LoadingSpinnerComponent } from './loading-spinner.component';

describe('LoadingSpinnerComponent', () => {
  let component: LoadingSpinnerComponent;
  let fixture: ComponentFixture<LoadingSpinnerComponent>;

  const root = (): HTMLElement => fixture.nativeElement.querySelector('.loading-spinner');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [LoadingSpinnerComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(LoadingSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to a medium block spinner in the default variant', () => {
    expect(component.size).toBe('medium');
    expect(component.layout).toBe('block');
    expect(component.variant).toBe('default');
    expect(component.message).toBeUndefined();

    expect(root().classList).toContain('loading-spinner--medium');
    expect(root().classList).toContain('loading-spinner--block');
    expect(root().classList).toContain('loading-spinner--default');
  });

  it('should always render the ring', () => {
    expect(fixture.nativeElement.querySelector('.loading-spinner__ring')).toBeTruthy();
  });

  it('should render the message only when one is given', () => {
    expect(fixture.nativeElement.querySelector('.loading-spinner__message')).toBeNull();

    fixture.componentRef.setInput('message', 'Loading products');
    fixture.detectChanges();

    const message = fixture.nativeElement.querySelector('.loading-spinner__message');
    expect(message.textContent.trim()).toBe('Loading products');
  });

  it('should reflect the size on the root element', () => {
    fixture.componentRef.setInput('size', 'large');
    fixture.detectChanges();

    expect(root().classList).toContain('loading-spinner--large');
    expect(root().classList).not.toContain('loading-spinner--medium');
  });

  it('should reflect the inline layout and light variant', () => {
    fixture.componentRef.setInput('layout', 'inline');
    fixture.componentRef.setInput('variant', 'light');
    fixture.detectChanges();

    expect(root().classList).toContain('loading-spinner--inline');
    expect(root().classList).toContain('loading-spinner--light');
    expect(root().classList).not.toContain('loading-spinner--block');
  });
});
