import {
  CREATE_WORKSPACE,
  FeatureWorkspaceRouteState,
  IMPORT_WORKSPACE,
  WORKSPACES
} from '@angular-console/feature-workspaces';
import { FADE_IN } from '@angular-console/ui';
import { Settings } from '@angular-console/utils';
import { transition, trigger } from '@angular/animations';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import {
  AuthService,
  Breadcrumb,
  ContextualActionBarService
} from '@nrwl/angular-console-enterprise-frontend';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

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
    this.routerTransition = this.routerOutlet.activateEvents.pipe(
      map(() => this.routerOutlet.activatedRouteData.state)
    );
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      console.log('is authenticated?', isAuthenticated);
    });
  }

  ngOnDestroy(): void {
    this.titleSubscription.unsubscribe();
  }

  sidenavLinks: SidenavLink[] = [
    { icon: 'view_list', route: '/workspaces', text: 'Workspaces' }
  ];

  constructor(
    router: Router,
    public settings: Settings,
    private readonly contextualActionBarService: ContextualActionBarService,
    private readonly authService: AuthService,
    private readonly titleService: Title
  ) {
    settings.fetch().subscribe(() => {
      if (settings.showConnectPlugin()) {
        this.sidenavLinks.push({
          icon: 'question_answer',
          route: '/connect',
          text: 'Nrwl Connect'
        });
      }
    });
    router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event => {
        const navigationEnd = event as NavigationEnd;
        if (navigationEnd.url.startsWith('/install-nodejs')) {
          contextualActionBarService.contextualTabs$.next(null);
          contextualActionBarService.breadcrumbs$.next([
            { title: 'Welcome to Angular Console' }
          ]);
          contextualActionBarService.nonContextualActions$.next([]);
          contextualActionBarService.contextualActions$.next(null);
        } else if (navigationEnd.url.startsWith('/workspace/')) {
          contextualActionBarService.contextualTabs$.next(null);
        } else {
          switch (
            this.routerOutlet.activatedRouteData
              .state as FeatureWorkspaceRouteState
          ) {
            case CREATE_WORKSPACE:
              contextualActionBarService.breadcrumbs$.next([
                { title: 'Create Workspace' }
              ]);
              break;
            case IMPORT_WORKSPACE:
              contextualActionBarService.breadcrumbs$.next([
                { title: 'Open Workspace' }
              ]);
              break;
            case WORKSPACES:
              contextualActionBarService.breadcrumbs$.next([
                { title: 'Workspaces' }
              ]);
              break;
          }

          contextualActionBarService.contextualTabs$.next({
            tabs: [
              {
                icon: 'view_list',
                name: 'Recent',
                routerLink: '/workspaces'
              },
              {
                icon: 'create_new_folder',
                name: 'Create Workspace',
                routerLink: '/create-workspace'
              },
              {
                icon: 'folder_open',
                name: 'Open',
                routerLink: '/open-workspace'
              }
            ]
          });
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
    .concat([DEFAULT_TITLE])
    .join(TITLE_SEPARATOR);
}
