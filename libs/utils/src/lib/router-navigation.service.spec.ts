import { fakeAsync, getTestBed, TestBed } from '@angular/core/testing';
import { RouterNavigationService } from './router-navigation.service';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { Component, NgModule } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { NavigationEnd, Router, Routes } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({ selector: 'angular-console-test-cmp', template: '' })
class TestComponent {}

@NgModule({
  declarations: [TestComponent],
  imports: [RouterTestingModule]
})
class TestSharedModule {}

const testRoutes: Routes = [
  {
    path: ':id',
    component: TestComponent
  }
];

describe('RouterNavigationService', () => {
  beforeEach(() => {
    TestBed.resetTestEnvironment();

    TestBed.initTestEnvironment(
      BrowserDynamicTestingModule,
      platformBrowserDynamicTesting()
    ).configureTestingModule({
      providers: [RouterNavigationService],
      imports: [TestSharedModule, RouterTestingModule.withRoutes(testRoutes)]
    });
  });

  it('navigates to fallback route if unable to go back', fakeAsync(async () => {
    const service: RouterNavigationService = TestBed.get(
      RouterNavigationService
    );

    const injector = getTestBed();
    const router = injector.get(Router);
    const fixture = TestBed.createComponent(TestComponent);
    const visited = [] as string[];
    const sub = router.events
      .pipe(
        filter(evt => {
          return evt instanceof NavigationEnd;
        })
      )
      .subscribe((evt: NavigationEnd) => {
        visited.push(evt.url);
      });
    fixture.detectChanges();

    await service.goBackOrNavigateToFallback(['/1']);

    expect(visited).toEqual(['/1']);

    sub.unsubscribe();
  }));
});
