import { IS_INTELLIJ } from '@angular-console/environment';
import { FADE_IN } from '@angular-console/ui';
import { Settings, Telemetry } from '@angular-console/utils';
import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  ViewEncapsulation
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { combineLatest, Observable } from 'rxjs';
import {
  filter,
  map,
  publishReplay,
  refCount,
  shareReplay,
  switchMap
} from 'rxjs/operators';

import { BasicWorkspaceGQL } from '../generated/graphql';

interface Route {
  icon?: string;
  svgIcon?: string;
  url: string;
  title: string;
}

const TASK_RUNNER_GHOST_STYLE = style({
  'background-color': '#F5F5F5',
  background: 'linear-gradient(to bottom,  #ffffff 55px,#F5F5F5 2%)'
});

@Component({
  selector: 'angular-console-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('growShrink', [
      state('collapse', style({ width: '0' })),
      state('expand', style({ width: '52px' })),
      transition(`* <=> *`, animate(`300ms cubic-bezier(0.4, 0.0, 0.2, 1)`))
    ]),
    trigger('routerTransition', [
      transition('void => *', []),
      transition('generate <=> tasks', []),
      transition('extensions <=> tasks', []),
      transition('generate <=> extensions', []),
      transition('* => tasks', [TASK_RUNNER_GHOST_STYLE, FADE_IN]),
      transition('* => generate', [TASK_RUNNER_GHOST_STYLE, FADE_IN]),
      transition('* => extensions', [TASK_RUNNER_GHOST_STYLE, FADE_IN]),
      transition('* => *', FADE_IN)
    ])
  ]
})
export class WorkspaceComponent implements OnDestroy, OnInit {
  readonly activeRouteTitle$: Observable<string> = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    map(() => {
      const firstChild = this.route.snapshot.firstChild;
      if (!firstChild) {
        throw new Error('This should never happen');
      }

      const url = firstChild.url[0].path;

      const route = this.routes.find(r => r.url.startsWith(url));
      if (!route) {
        return '';
      }

      return route.title;
    }),
    shareReplay(1)
  );

  routes: Array<Route> = [
    { icon: 'view_list', url: 'projects', title: 'Projects' },
    { icon: 'code', url: 'generate', title: 'Generate' },
    { svgIcon: 'console', url: 'tasks', title: 'Tasks' },
    {
      icon: 'extension',
      url: 'extensions',
      title: 'Extensions'
    },
    {
      icon: 'timeline',
      url: 'connect/affected-projects',
      title: 'Dependency Diagram'
    },
    {
      icon: 'question_answer',
      url: 'connect/support',
      title: 'Connect'
    },
    { icon: 'settings', url: 'settings', title: 'Settings' }
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

  private readonly workspace$: Observable<{
    name: string;
    path: string;
  }> = this.route.params.pipe(
    map(m => m.path),
    switchMap(path => {
      return this.basicWorkspaceGQL.fetch({
        path
      });
    }),
    map((r: any) => r.data.workspace),
    publishReplay(1),
    refCount()
  );

  private readonly workplaceSubscription = combineLatest([
    this.workspace$,
    this.activeRouteTitle$
  ]).subscribe(([workspace, routeTitle]) => {
    this.contextualActionBarService.breadcrumbs$.next([
      { title: workspace.name },
      { title: routeTitle }
    ]);
  });

  private readonly subscription = this.workspace$.subscribe(w => {
    this.settings.addRecent({
      name: w.name,
      path: w.path,
      favorite: false,
      pinnedProjectNames: []
    });
  });

  constructor(
    @Inject(IS_INTELLIJ) readonly isIntellij: boolean,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly settings: Settings,
    private readonly telemetry: Telemetry,
    private readonly contextualActionBarService: ContextualActionBarService,
    private readonly basicWorkspaceGQL: BasicWorkspaceGQL
  ) {}

  ngOnDestroy(): void {
    this.contextualActionBarService.nonContextualActions$.next([]);
    this.workplaceSubscription.unsubscribe();
    this.subscription.unsubscribe();
  }

  ngOnInit(): void {
    this.telemetry.screenViewed('Workspace');
  }
}
