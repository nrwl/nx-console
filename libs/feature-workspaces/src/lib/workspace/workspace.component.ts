import {
  Component,
  HostBinding,
  OnDestroy,
  ViewEncapsulation
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { ContextualActionBarService } from '@nxui/ui';
import { Settings } from '@nxui/utils';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';
import {
  filter,
  map,
  publishReplay,
  refCount,
  shareReplay,
  startWith,
  switchMap,
  withLatestFrom
} from 'rxjs/operators';

import { ROUTING_ANIMATION } from './workspace.component.animations';

interface Route {
  icon: string;
  url: string;
  title: string;
}

@Component({
  selector: 'nxui-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [ROUTING_ANIMATION]
})
export class WorkspaceComponent implements OnDestroy {
  @HostBinding('@.disabled') animationsDisabled = false;

  readonly activeRouteTitle$: Observable<string> = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    map((event: NavigationEnd) => event.url),
    startWith(this.router.url),
    map((url: string) => {
      const route = this.routes.find(r => url.indexOf(r.url) > -1);
      return route ? route.title : '';
    }),
    shareReplay(1)
  );

  readonly routes: Array<Route> = [
    { icon: 'details', url: 'details', title: 'View Workspace Details' },
    { icon: 'create_new_folder', url: 'generate', title: 'Generate Code' },
    {
      icon: 'extension',
      url: 'extensions',
      title: 'Add/Remove CLI Extensions'
    },
    { icon: 'chevron_right', url: 'tasks', title: 'Run Tasks' }
  ];

  private readonly workspace$ = this.route.params.pipe(
    map(m => m['path']),
    switchMap(path => {
      return this.apollo.watchQuery({
        pollInterval: 2000,
        query: gql`
          query($path: String!) {
            workspace(path: $path) {
              path
              name
            }
          }
        `,
        variables: {
          path
        }
      }).valueChanges;
    }),
    map((r: any) => r.data.workspace),
    publishReplay(1),
    refCount()
  );

  private readonly workplaceSubscription = this.workspace$
    .pipe(withLatestFrom(this.activeRouteTitle$))
    .subscribe(([workspaceName, routeTitle]) => {
      this.contextualActionBarService.breadcrumbs$.next([
        { title: workspaceName.name },
        { title: routeTitle }
      ]);
    });

  private readonly subscription = this.workspace$.subscribe(w => {
    this.settings.addRecent({ name: w.name, path: w.path });
  });

  constructor(
    private readonly apollo: Apollo,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly settings: Settings,
    private readonly contextualActionBarService: ContextualActionBarService
  ) {}

  ngOnDestroy(): void {
    this.workplaceSubscription.unsubscribe();
    this.subscription.unsubscribe();
  }

  toggleAnimations() {
    this.animationsDisabled = !this.animationsDisabled;
  }
}
