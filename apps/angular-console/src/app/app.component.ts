import { FADE_IN } from '@angular-console/ui';
import { Settings } from '@angular-console/utils';
import { transition, trigger } from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import {
  Breadcrumb,
  ContextualActionBarService
} from '@nrwl/angular-console-enterprise-frontend';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

const TITLE_SEPARATOR = ' | ';

@Component({
  selector: 'angular-console-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('routerTransition', [
      transition('void => *', []),
      transition(`* => *`, FADE_IN)
    ])
  ]
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild(RouterOutlet) routerOutlet: RouterOutlet;
  routerTransition: Observable<string>;

  ngOnInit() {
    this.contextualActionBarService.contextualTabs$.next(null);
    this.routerTransition = this.routerOutlet.activateEvents.pipe(
      map(() => this.routerOutlet.activatedRouteData.state)
    );
  }

  ngOnDestroy(): void {
    this.titleSubscription.unsubscribe();
  }

  constructor(
    settings: Settings,
    private readonly contextualActionBarService: ContextualActionBarService,
    private readonly titleService: Title,
    router: Router
  ) {
    settings.fetch().subscribe();

    router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        if (e.urlAfterRedirects === '/connect') {
          // TODO: This logic belong within angular-console-enterprise-frontend
          this.contextualActionBarService.breadcrumbs$.next([
            { title: 'Connect' }
          ]);
        } else if (e.urlAfterRedirects === '/settings') {
          // TODO: This logic belong within the settings component after electron redesign.
          this.contextualActionBarService.breadcrumbs$.next([
            { title: 'Settings' }
          ]);
        }
      });
  }

  private readonly titleSubscription = this.contextualActionBarService.breadcrumbs$
    .pipe(map(makeTitle))
    .subscribe(title => {
      this.titleService.setTitle(title);
    });
}

function makeTitle(tabs: Breadcrumb[]) {
  return tabs
    .reduce(
      (acc, t) => {
        acc.unshift(t.title);
        return acc;
      },
      [] as string[]
    )
    .join(TITLE_SEPARATOR);
}
