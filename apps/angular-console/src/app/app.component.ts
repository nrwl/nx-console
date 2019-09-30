import { Settings } from '@angular-console/utils';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import {
  Breadcrumb,
  ContextualActionBarService
} from '@nrwl/angular-console-enterprise-frontend';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const TITLE_SEPARATOR = ' | ';

@Component({
  selector: 'angular-console-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild(RouterOutlet, { static: true }) routerOutlet: RouterOutlet;
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
    readonly settings: Settings,
    private readonly contextualActionBarService: ContextualActionBarService,
    private readonly titleService: Title
  ) {
    settings.fetch().subscribe();
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
