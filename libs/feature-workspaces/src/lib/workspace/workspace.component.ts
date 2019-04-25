import { IS_ELECTRON, IS_INTELLIJ } from '@angular-console/environment';
import { FADE_IN } from '@angular-console/ui';
import {
  BASIC_WORKSPACE_POLLING,
  EditorSupport,
  Settings
} from '@angular-console/utils';
import {
  style,
  transition,
  trigger,
  state,
  animate
} from '@angular/animations';
import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  ChangeDetectionStrategy
} from '@angular/core';
import { MediaObserver } from '@angular/flex-layout';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import {
  ContextualActionBarService,
  MenuOption
} from '@nrwl/angular-console-enterprise-frontend';
import { combineLatest, Observable } from 'rxjs';
import {
  filter,
  first,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('growShrink', [
      state('void', style({ width: '0' })),
      state('collapse', style({ width: '0', position: 'absolute' })),
      state('expand', style({ width: '*' })),
      transition(
        `expand <=> collapse`,
        animate(`300ms cubic-bezier(0.4, 0.0, 0.2, 1)`)
      )
    ]),
    trigger('routerTransition', [
      transition('void => *', []),
      transition('* => tasks', [TASK_RUNNER_GHOST_STYLE, FADE_IN]),
      transition('* => generate', [TASK_RUNNER_GHOST_STYLE, FADE_IN]),
      transition('* => extensions', [TASK_RUNNER_GHOST_STYLE, FADE_IN]),
      transition('* => *', FADE_IN)
    ])
  ]
})
export class WorkspaceComponent implements OnInit, OnDestroy {
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
      return this.basicWorkspaceGQL.watch(
        {
          path
        },
        {
          pollInterval: BASIC_WORKSPACE_POLLING
        }
      ).valueChanges;
    }),
    map((r: any) => r.data.workspace),
    publishReplay(1),
    refCount()
  );

  private readonly editorSubscription = combineLatest(
    this.editorSupport.editors,
    this.mediaObserver.media$
  ).subscribe(([editors, mediaChange]) => {
    switch (mediaChange.mqAlias) {
      case 'xs':
        this.contextualActionBarService.nonContextualActions$.next([]);
        return;
    }
    if (this.isElectron) {
      this.contextualActionBarService.nonContextualActions$.next([
        {
          name: 'Open in...',
          description: 'Open workspace in another program',
          icon: 'open_in_browser',
          options: editors.map(
            (editor): MenuOption => {
              return {
                name: `${editor.name}`,
                image: editor.icon,
                invoke: () => {
                  this.workspace$
                    .pipe(first())
                    .subscribe(w =>
                      this.editorSupport.openInEditor(editor.name, w.path)
                    );
                }
              };
            }
          )
        }
      ]);
    }
  });

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
    this.settings.addRecent({
      name: w.name,
      path: w.path,
      favorite: false,
      pinnedProjectNames: []
    });
  });

  constructor(
    @Inject(IS_ELECTRON) readonly isElectron: boolean,
    @Inject(IS_INTELLIJ) readonly isIntellij: boolean,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly settings: Settings,
    private readonly mediaObserver: MediaObserver,
    private readonly contextualActionBarService: ContextualActionBarService,
    private readonly editorSupport: EditorSupport,
    private readonly basicWorkspaceGQL: BasicWorkspaceGQL
  ) {
    settings.fetch().subscribe(() => {
      if (this.settings.showConnectPlugin()) {
        this.routes.splice(this.routes.length - 2, 0, {
          icon: 'question_answer',
          url: 'connect',
          title: 'Connect'
        });
      }
    });
  }

  ngOnInit(): void {
    this.settings.fetch().subscribe(() => {
      if (this.settings.isConnectUser()) {
        this.routes = [
          this.routes[0],
          {
            icon: 'timeline',
            url: 'connect/affected-projects',
            title: 'Affected Projects'
          },
          ...this.routes.slice(1)
        ];
      }
    });
  }

  ngOnDestroy(): void {
    this.contextualActionBarService.nonContextualActions$.next([]);
    this.workplaceSubscription.unsubscribe();
    this.subscription.unsubscribe();
    this.editorSubscription.unsubscribe();
  }
}
