import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { debounceTime, Subject, Subscription } from 'rxjs';
import {
  ActivityFilters,
  AUDIT_ACTIONS,
  AuditAction,
  AuditLog,
  AuditLogQuery,
  TypeToggle,
} from '../models/audit-log.model';
import { AuditLogApiService } from '../services/audit-log-api.service';
import { localDayStart, USER_FILTER_DEBOUNCE_MS } from '../utils/admin-filters';
import { trackById, trackByValue } from '@shared/utils/track-by';
import { NotificationService } from '@core/services/ui/notification.service';

export const ACTIVITY_PAGE_SIZE = 25;

const NO_FILTERS: ActivityFilters = {
  user: '',
  action: '',
  result: '',
  from: '',
  to: '',
  showApiReads: false,
};

@Component({
  selector: 'app-activity-log',
  templateUrl: './activity-log.component.html',
  styleUrl: './activity-log.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityLogComponent implements OnInit, OnDestroy {
  readonly pageSize = ACTIVITY_PAGE_SIZE;

  logs: AuditLog[] = [];
  total = 0;
  offset = 0;
  isLoading = true;
  filters: ActivityFilters = { ...NO_FILTERS };

  readonly trackById = trackById;
  readonly trackByValue = trackByValue;
  expandedId: number | null = null;

  private readonly userTerms = new Subject<string>();
  private readonly subscriptions = new Subscription();
  private pageRequest?: Subscription;

  constructor(
    private auditLogApi: AuditLogApiService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  get actionOptions(): AuditAction[] {
    const { showApiReads } = this.filters;
    return AUDIT_ACTIONS.filter((action) => action !== 'READ' || showApiReads);
  }

  get hasFilters(): boolean {
    const { user, action, result, from, to, showApiReads } = this.filters;
    return !!(user.trim() || action || result || from || to || showApiReads);
  }

  get rangeStart(): number {
    return this.logs.length ? this.offset + 1 : 0;
  }

  get rangeEnd(): number {
    return this.offset + this.logs.length;
  }

  get hasPrevious(): boolean {
    return this.offset > 0;
  }

  get hasNext(): boolean {
    return this.offset + this.logs.length < this.total;
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.userTerms.pipe(debounceTime(USER_FILTER_DEBOUNCE_MS)).subscribe(() => this.fetchPage(0)),
    );

    this.fetchPage(0);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.pageRequest?.unsubscribe();
  }

  onUserFilterChange(term: string): void {
    this.filters = { ...this.filters, user: term };
    this.userTerms.next(term);
  }

  setFilter<K extends 'action' | 'result' | 'from' | 'to'>(key: K, value: ActivityFilters[K]): void {
    this.filters = { ...this.filters, [key]: value };
    this.fetchPage(0);
  }

  setShown(toggle: TypeToggle, show: boolean): void {
    this.filters = { ...this.filters, [toggle]: show };
    const { action } = this.filters;
    if (action && !this.actionOptions.includes(action)) this.filters = { ...this.filters, action: '' };
    this.fetchPage(0);
  }

  clearFilters(): void {
    this.filters = { ...NO_FILTERS };
    this.fetchPage(0);
  }

  refresh(): void {
    this.fetchPage(this.offset);
  }

  previousPage(): void {
    if (this.hasPrevious) this.fetchPage(Math.max(0, this.offset - this.pageSize));
  }

  nextPage(): void {
    if (this.hasNext) this.fetchPage(this.offset + this.pageSize);
  }

  toggleDetails(id: number): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  isFailure(log: AuditLog): boolean {
    return (log.statusCode ?? 0) >= 400;
  }

  trackByDetail(_index: number, detail: { key: string }): string {
    return detail.key;
  }

  detailText(value: string | number | boolean | string[]): string {
    return Array.isArray(value) ? value.join(', ') : String(value);
  }

  private fetchPage(offset: number): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.pageRequest?.unsubscribe();
    this.pageRequest = this.auditLogApi.getAuditLogs(this.buildQuery(offset)).subscribe({
      next: (page) => {
        this.logs = page.items;
        this.total = page.total;
        this.offset = offset;
        this.expandedId = null;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.notificationService.error('Failed to load the activity log');
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private buildQuery(offset: number): AuditLogQuery {
    const { user, action, result, from, to } = this.filters;
    const term = user.trim();
    const isUserId = /^\d+$/.test(term);
    const shown = this.actionOptions;

    return {
      limit: this.pageSize,
      offset,
      userId: isUserId ? Number(term) : undefined,
      username: term && !isUserId ? term : undefined,
      actions: action ? [action] : shown.length < AUDIT_ACTIONS.length ? shown : undefined,
      result: result || undefined,
      from: from ? localDayStart(from) : undefined,
      to: to ? localDayStart(to, 1) : undefined,
    };
  }
}
