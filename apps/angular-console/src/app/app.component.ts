import {
  CREATE_WORKSPACE,
  FeatureWorkspaceRouteState,
  IMPORT_WORKSPACE,
  WORKSPACES
} from '@angular-console/feature-workspaces';
import { FADE_IN } from '@angular-console/ui';
import { transition, trigger } from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import {
  AuthService,
  ContextualActionBarService
} from '@nrwl/angular-console-enterprise-frontend';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Settings } from '@angular-console/utils';
import { isPlatformBrowser } from '@angular/common';

interface SidenavLink {
  icon: string;
  route: string;
  text: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
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
export class AppComponent implements OnInit {
  @ViewChild(RouterOutlet) routerOutlet: RouterOutlet;
  routerTransition: Observable<string>;
  settingsLoaded: boolean;
  showSiteMenu = false;
  isBrowser: boolean;

  ngOnInit() {
    this.routerTransition = this.routerOutlet.activateEvents.pipe(
      map(() => this.routerOutlet.activatedRouteData.state)
    );
  }

  sidenavLinks: SidenavLink[] = [
    { icon: 'view_list', route: '/workspaces', text: 'Recent Workspaces' }
  ];

  constructor(
    router: Router,
    public settings: Settings,
    @Inject(PLATFORM_ID) private readonly platformId: string,
    contextualActionBarService: ContextualActionBarService,
    private readonly authService: AuthService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      settings.fetch().subscribe(() => {
        this.settingsLoaded = true;
        if (settings.showSupportPlugin()) {
          this.sidenavLinks.push({
            icon: 'question_answer',
            route: '/support',
            text: 'Ask a Narwhal Engineer'
          });
        }
        router.initialNavigation();
      });
    } else {
      this.settingsLoaded = true;
      router.initialNavigation();
    }

    router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event => {
        const navigationEnd = event as NavigationEnd;
        if (navigationEnd.url.startsWith('/workspace/')) {
          contextualActionBarService.contextualTabs$.next(null);
        } else if (navigationEnd.url === '/_app-shell') {
          contextualActionBarService.breadcrumbs$.next([
            { title: 'Loading' }
          ]);
        } else {
          switch (
            this.routerOutlet.activatedRouteData
              .state as FeatureWorkspaceRouteState
          ) {
            case CREATE_WORKSPACE:
              contextualActionBarService.breadcrumbs$.next([
                { title: 'Create A New Workspace' }
              ]);
              break;
            case IMPORT_WORKSPACE:
              contextualActionBarService.breadcrumbs$.next([
                { title: 'Import An Existing Workspace' }
              ]);
              break;
            case WORKSPACES:
              contextualActionBarService.breadcrumbs$.next([
                { title: 'Recently Opened Workspaces' }
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
                name: 'Create',
                routerLink: '/create-workspace'
              },
              {
                icon: 'folder_open',
                name: 'Import',
                routerLink: '/import-workspace'
              }
            ]
          });
        }
      });
  }
}
