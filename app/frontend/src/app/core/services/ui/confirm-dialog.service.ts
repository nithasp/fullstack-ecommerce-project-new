import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, take } from 'rxjs';
import { ConfirmDialogConfig } from '../../models/confirm-dialog.model';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly configSubject = new BehaviorSubject<ConfirmDialogConfig | null>(null);

  /**
   * One channel per request, rather than a single shared Subject: two overlapping `confirm()` calls
   * used to resolve from the same emission, so dismissing one answered both.
   */
  private pending: Subject<boolean> | null = null;

  readonly config$ = this.configSubject.asObservable();

  confirm(config: ConfirmDialogConfig): Observable<boolean> {
    // A request that is replaced before it is answered resolves as a cancel, so its caller is
    // never left waiting on a dialog that is no longer on screen
    this.pending?.next(false);
    this.pending?.complete();

    const pending = new Subject<boolean>();
    this.pending = pending;
    this.configSubject.next(config);

    return pending.pipe(take(1));
  }

  resolve(confirmed: boolean): void {
    const pending = this.pending;
    this.pending = null;
    this.configSubject.next(null);
    pending?.next(confirmed);
    pending?.complete();
  }
}
