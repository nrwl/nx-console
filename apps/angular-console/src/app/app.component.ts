import { FADE_IN } from '@angular-console/ui';
import { Settings } from '@angular-console/utils';
import { transition, trigger } from '@angular/animations';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import {
  Breadcrumb,
  ContextualActionBarService
} from '@nrwl/angular-console-enterprise-frontend';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface SidenavLink {
  icon: string;
  route: string;
  text: string;
}

const DEFAULT_TITLE = 'Angular Console';
const TITLE_SEPARATOR = ' - ';

@Component({
  selector: 'angular-console-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
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
  settingsLoaded: boolean;
  showSiteMenu = false;

  ngOnInit() {
    this.settings.fetch().subscribe(() => {
      if (this.settings.showConnectPlugin()) {
        this.sidenavLinks.push({
          icon: 'question_answer',
          route: '/connect',
          text: 'Nrwl Connect'
        });
      }
    });
    this.contextualActionBarService.contextualTabs$.next(null);
    this.routerTransition = this.routerOutlet.activateEvents.pipe(
      map(() => this.routerOutlet.activatedRouteData.state)
    );
  }

  ngOnDestroy(): void {
    this.titleSubscription.unsubscribe();
  }

  sidenavLinks: SidenavLink[] = [
    { icon: 'view_list', route: '/workspaces', text: 'Workspaces' },
    { icon: 'settings', route: '/settings', text: 'Settings' }
  ];

  constructor(
    private readonly settings: Settings,
    private readonly contextualActionBarService: ContextualActionBarService,
    private readonly titleService: Title
  ) {}

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
    .concat([DEFAULT_TITLE])
    .join(TITLE_SEPARATOR);
}
