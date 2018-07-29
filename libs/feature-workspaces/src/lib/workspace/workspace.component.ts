import { transition, trigger } from '@angular/animations';
import {
  Component,
  HostBinding,
  OnDestroy,
  ViewEncapsulation,
  ChangeDetectionStrategy
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import {
  animateDown,
  animateUp,
  ContextualActionBarService,
  GROW_SHRINK
} from '@nxui/ui';
import { Settings } from '@nxui/utils';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { combineLatest, Observable } from 'rxjs';
import {
  filter,
  map,
  publishReplay,
  refCount,
  shareReplay,
  switchMap
} from 'rxjs/operators';

interface Route {
  icon: string;
  url: string;
  title: string;
}

const ROUTER_TRANSITION_TIMING = '500ms ease-in-out';
const ANIMATE_UP = animateUp(ROUTER_TRANSITION_TIMING);
const ANIMATE_DOWN = animateDown(ROUTER_TRANSITION_TIMING);

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nxui-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    GROW_SHRINK,
    trigger('routerTransition', [
      transition('details => tasks', ANIMATE_DOWN),
      transition('details => generate', ANIMATE_DOWN),
      transition('details => extensions', ANIMATE_DOWN),

      transition('tasks => details', ANIMATE_UP),
      transition('tasks => generate', ANIMATE_UP),
      transition('tasks => extensions', ANIMATE_DOWN),

      transition('generate => extensions', ANIMATE_DOWN),
      transition('generate => details', ANIMATE_UP),
      transition('generate => tasks', ANIMATE_DOWN),

      transition('extensions => generate', ANIMATE_UP),
      transition('extensions => details', ANIMATE_UP),
      transition('extensions => tasks', ANIMATE_UP)
    ])
  ]
})
export class WorkspaceComponent implements OnDestroy {
  @HostBinding('@.disabled') animationsDisabled = false;

  readonly activeRouteTitle$: Observable<string> = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    map(() => {
      const firstChild = this.route.snapshot.firstChild;
      if (!firstChild) {
        throw new Error('This should never happen');
      }

      const url = firstChild.url[0].path;

      const route = this.routes.find(r => url.indexOf(r.url) > -1);
      if (!route) {
        throw new Error('This should never happen');
      }

      return route.title;
    }),
    shareReplay(1)
  );

  readonly routes: Array<Route> = [
    { icon: 'view_list', url: 'details', title: 'Workspace Overview' },
    { icon: 'code', url: 'generate', title: 'Generate Code' },
    { icon: 'play_arrow', url: 'tasks', title: 'Run Tasks' },
    {
      icon: 'extension',
      url: 'extensions',
      title: 'Add/Remove CLI Extensions'
    }
  ];

  readonly sideNavAnimationState$ = this.contextualActionBarService.contextualActions$.pipe(
    map(actions => {
      if (actions === null) {
        return 'expand';
      } else {
        return 'collapse';
      }
    })
  );

  private readonly workspace$ = this.route.params.pipe(
    map(m => m.path),
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

  private readonly workplaceSubscription = combineLatest(
    this.workspace$,
    this.activeRouteTitle$
  ).subscribe(([workspace, routeTitle]) => {
    this.contextualActionBarService.breadcrumbs$.next([
      { title: workspace.name },
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
