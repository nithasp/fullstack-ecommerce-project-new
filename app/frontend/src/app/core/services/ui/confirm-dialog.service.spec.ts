import { TestBed } from '@angular/core/testing';
import { ConfirmDialogService } from './confirm-dialog.service';
import { ConfirmDialogConfig } from '../../models/confirm-dialog.model';

describe('ConfirmDialogService', () => {
  let service: ConfirmDialogService;

  const config: ConfirmDialogConfig = { title: 'Delete', message: 'Are you sure?' };
  const other: ConfirmDialogConfig = { title: 'Other', message: 'Also sure?' };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ConfirmDialogService] });
    service = TestBed.inject(ConfirmDialogService);
  });

  it('should start with no dialog on screen', () => {
    const seen: (ConfirmDialogConfig | null)[] = [];
    service.config$.subscribe((c) => seen.push(c));
    expect(seen).toEqual([null]);
  });

  it('should publish the config so the dialog can render', () => {
    const seen: (ConfirmDialogConfig | null)[] = [];
    service.config$.subscribe((c) => seen.push(c));

    service.confirm(config).subscribe();
    expect(seen[seen.length - 1]).toEqual(config);
  });

  it('should emit true and complete when confirmed', () => {
    let result: boolean | undefined;
    let completed = false;
    service.confirm(config).subscribe({ next: (r) => (result = r), complete: () => (completed = true) });

    service.resolve(true);

    expect(result).toBeTrue();
    expect(completed).toBeTrue();
  });

  it('should emit false when cancelled', () => {
    let result: boolean | undefined;
    service.confirm(config).subscribe((r) => (result = r));

    service.resolve(false);

    expect(result).toBeFalse();
  });

  it('should clear the config once resolved', () => {
    const seen: (ConfirmDialogConfig | null)[] = [];
    service.config$.subscribe((c) => seen.push(c));

    service.confirm(config).subscribe();
    service.resolve(true);

    expect(seen[seen.length - 1]).toBeNull();
  });

  it('should answer only the pending request, not an earlier one', () => {
    const answers: boolean[] = [];
    service.confirm(config).subscribe((r) => answers.push(r));
    service.confirm(other).subscribe((r) => answers.push(r));

    service.resolve(true);

    // The replaced request resolves as a cancel, the pending one takes the real answer; a single
    // shared Subject used to hand both callers the same `true`
    expect(answers).toEqual([false, true]);
  });

  it('should ignore a resolve with nothing pending', () => {
    expect(() => service.resolve(true)).not.toThrow();
  });

  it('should not deliver a second answer to an already-resolved caller', () => {
    const answers: boolean[] = [];
    service.confirm(config).subscribe((r) => answers.push(r));

    service.resolve(true);
    service.resolve(false);

    expect(answers).toEqual([true]);
  });
});
