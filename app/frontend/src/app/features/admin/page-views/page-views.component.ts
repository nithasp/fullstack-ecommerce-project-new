import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { debounceTime, Subject, Subscription } from 'rxjs';
import { PageView, PageViewQuery } from '../models/page-view.model';
import { PageViewApiService } from '../services/page-view-api.service';
import { localDayStart, USER_FILTER_DEBOUNCE_MS } from '../utils/admin-filters';
import { trackById } from '@shared/utils/track-by';
import { NotificationService } from '@core/services/ui/notification.service';

export const PAGE_VIEWS_PAGE_SIZE = 25;

export interface PageViewFilters {
  user: string;
  path: string;
  from: string;
  to: string;
}

const NO_FILTERS: PageViewFilters = { user: '', path: '', from: '', to: '' };

@Component({
  selector: 'app-page-views',
  templateUrl: './page-views.component.html',
  styleUrl: './page-views.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageViewsComponent implements OnInit, OnDestroy {
  readonly pageSize = PAGE_VIEWS_PAGE_SIZE;

  views: PageView[] = [];
  total = 0;
  offset = 0;
  isLoading = true;
  filters: PageViewFilters = { ...NO_FILTERS };

  readonly trackById = trackById;
  expandedId: number | null = null;

  private readonly filterTerms = new Subject<void>();
  private readonly subscriptions = new Subscription();
  private pageRequest?: Subscription;

  constructor(
    private pageViewApi: PageViewApiService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  get hasFilters(): boolean {
    const { user, path, from, to } = this.filters;
    return !!(user.trim() || path.trim() || from || to);
  }

  get rangeStart(): number {
    return this.views.length ? this.offset + 1 : 0;
  }

  get rangeEnd(): number {
    return this.offset + this.views.length;
  }

  get hasPrevious(): boolean {
    return this.offset > 0;
  }

  get hasNext(): boolean {
    return this.offset + this.views.length < this.total;
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.filterTerms.pipe(debounceTime(USER_FILTER_DEBOUNCE_MS)).subscribe(() => this.fetchPage(0)),
    );

    this.fetchPage(0);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.pageRequest?.unsubscribe();
  }

  onTextFilterChange<K extends 'user' | 'path'>(key: K, value: string): void {
    this.filters = { ...this.filters, [key]: value };
    this.filterTerms.next();
  }

  setFilter<K extends 'from' | 'to'>(key: K, value: string): void {
    this.filters = { ...this.filters, [key]: value };
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

  // OnPush: state that arrives from a request or a debounced filter, rather than from a
  // template event, has to say so
  private fetchPage(offset: number): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.pageRequest?.unsubscribe();
    this.pageRequest = this.pageViewApi.getPageViews(this.buildQuery(offset)).subscribe({
      next: (page) => {
        this.views = page.items;
        this.total = page.total;
        this.offset = offset;
        this.expandedId = null;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.notificationService.error('Failed to load page views');
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private buildQuery(offset: number): PageViewQuery {
    const { user, path, from, to } = this.filters;
    const term = user.trim();
    const isUserId = /^\d+$/.test(term);

    return {
      limit: this.pageSize,
      offset,
      userId: isUserId ? Number(term) : undefined,
      username: term && !isUserId ? term : undefined,
      path: path.trim() || undefined,
      from: from ? localDayStart(from) : undefined,
      to: to ? localDayStart(to, 1) : undefined,
    };
  }
}
