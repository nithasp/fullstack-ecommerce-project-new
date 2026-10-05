import { Component, NgZone, inject } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, ReplaySubject, Subject } from 'rxjs';
import { ToastrModule } from 'ngx-toastr';
import { AppComponent } from './app.component';
import { SharedModule } from '@shared/shared.module';
import { AuthService } from '@core/services/auth/auth.service';
import { PageViewService } from '@core/services/activity/page-view.service';

@Component({ template: '<p class="page">page</p>' })
class PageComponent {}

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let router: Router;
  let trackPageViewsSpy: jasmine.Spy;
  let initializeAuthSpy: jasmine.Spy;
  // Held open the way the guards hold a first page while they sign the visitor in to the demo
  let storeEntry: ReplaySubject<boolean>;
  let loginEntry: ReplaySubject<boolean>;

  const routes: Routes = [
    { path: 'products', component: PageComponent, canActivate: [() => storeEntry] },
    { path: 'auth/login', component: PageComponent, canActivate: [() => loginEntry] },
    {
      path: 'auth',
      component: PageComponent,
      canActivate: [() => inject(Router).createUrlTree(['/products'])],
    },
    { path: 'closed', component: PageComponent, canActivate: [() => false] },
    {
      path: 'broken',
      component: PageComponent,
      canActivate: [
        () => {
          throw new Error('chunk failed to load');
        },
      ],
    },
  ];

  const shows = (selector: string): boolean => {
    fixture.detectChanges();
    return fixture.nativeElement.querySelector(selector) !== null;
  };

  // The loader in index.html shows for as long as the app's host element stays empty
  const rendersNothing = (): boolean => {
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).matches(':empty');
  };

  const navigate = (url: string): Promise<boolean> =>
    TestBed.inject(NgZone).run(() => router.navigateByUrl(url));

  // ngOnInit runs before the first navigation starts, as it does when the app bootstraps
  const arriveAt = (url: string): Promise<boolean> => {
    fixture.detectChanges();
    return navigate(url);
  };

  beforeEach(async () => {
    storeEntry = new ReplaySubject<boolean>(1);
    loginEntry = new ReplaySubject<boolean>(1);

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ToastrModule.forRoot(), SharedModule],
      declarations: [AppComponent, PageComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();

    initializeAuthSpy = spyOn(TestBed.inject(AuthService), 'initializeAuth').and.returnValue(of(undefined));
    trackPageViewsSpy = spyOn(TestBed.inject(PageViewService), 'trackPageViews').and.callThrough();
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should have title MyStore', () => {
    expect(component.title).toBe('MyStore');
  });

  it('should render nothing while the first page is on its way, leaving the screen to the loader', fakeAsync(() => {
    void arriveAt('/products');
    tick();

    expect(rendersNothing()).toBeTrue();
  }));

  it('should show the navbar and the page once the first page lands', fakeAsync(() => {
    void arriveAt('/products');
    tick();
    storeEntry.next(true);
    tick();

    expect(shows('app-navbar')).toBeTrue();
    expect(shows('.page')).toBeTrue();
  }));

  it('should keep the loader up through a guard redirect', fakeAsync(() => {
    void arriveAt('/auth');
    tick();
    expect(rendersNothing()).toBeTrue();

    storeEntry.next(true);
    tick();
    expect(shows('app-navbar')).toBeTrue();
  }));

  it('should keep the loader up when a failed demo entry sends the visitor to the login page', fakeAsync(() => {
    void arriveAt('/products');
    tick();
    void navigate('/auth/login');
    tick();
    expect(rendersNothing()).toBeTrue();

    loginEntry.next(true);
    tick();
    expect(shows('app-navbar')).toBeTrue();
  }));

  it('should keep the loader up until the session check is done', fakeAsync(() => {
    const sessionCheck = new Subject<void>();
    initializeAuthSpy.and.returnValue(sessionCheck);
    storeEntry.next(true);
    void arriveAt('/products');
    tick();
    expect(rendersNothing()).toBeTrue();

    sessionCheck.next();
    sessionCheck.complete();
    expect(shows('app-navbar')).toBeTrue();
  }));

  it('should not leave the visitor on the loader when the first page is turned away', fakeAsync(() => {
    void arriveAt('/closed');
    tick();

    expect(shows('app-navbar')).toBeTrue();
  }));

  it('should not leave the visitor on the loader when the first navigation fails', fakeAsync(() => {
    let failed = false;
    arriveAt('/broken').catch(() => (failed = true));
    tick();

    expect(failed).toBeTrue();
    expect(shows('app-navbar')).toBeTrue();
  }));

  it('should start reporting page views once', () => {
    fixture.detectChanges();
    expect(trackPageViewsSpy).toHaveBeenCalledTimes(1);
  });
});
