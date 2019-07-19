import { IS_ELECTRON } from '@angular-console/environment';
import { FADE_IN } from '@angular-console/ui';
import {
  CommandRunner,
  Settings,
  toggleItemInArray
} from '@angular-console/utils';
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
  OnInit
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { combineLatest, Observable, of, ReplaySubject } from 'rxjs';
import {
  catchError,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap
} from 'rxjs/operators';

import {
  Workspace,
  WorkspaceDocsGQL,
  WorkspaceGQL,
  WorkspaceSchematics,
  WorkspaceSchematicsGQL
} from '../generated/graphql';
import {
  createLinkForTask,
  createLinksForCollection,
  isDefinedProjectAction,
  ProjectAction,
  SCHEMATIC_COLLECTION_ERROR_RESPONSE
} from './projects.constants';

const ACTION_BAR_HEIGHT_PX = 52;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss'],
  animations: [
    trigger('fadeIn', [
      state('hide', style({ opacity: 0, 'z-index': '-1' })),
      state('reveal', style({ opacity: 1, 'z-index': '2' })),
      transition(`hide <=> reveal`, [
        animate(`300ms cubic-bezier(0.4, 0.0, 0.2, 1)`),
        FADE_IN
      ])
    ])
  ]
})
export class ProjectsComponent implements OnInit, OnDestroy {
  private readonly viewportOffsetPx = this.isElectron ? 102 : 48;
  private readonly workspace$ = this.route.params.pipe(
    map(m => m.path),
    tap(path => {
      this.workspacePath = path;
    }),
    switchMap(path => {
      return combineLatest([
        this.workspaceGQL.fetch({ path }),
        this.workspaceSchematicsGQL
          .fetch({ path })
          .pipe(catchError(() => SCHEMATIC_COLLECTION_ERROR_RESPONSE))
      ]);
    }),
    filter(([r1, r2]) => Boolean(r1 && r2)),
    map(([r1, r2]) => {
      return {
        workspace: r1.data.workspace,
        schematicCollections: r2.data.workspace.schematicCollections
      };
    })
  );

  readonly animationState = new ReplaySubject<'reveal' | 'hide'>();

  workspacePath: string;
  pinnedProjectNames: string[];
  docs$ = this.settings.showDocs
    ? this.route.params.pipe(
        switchMap(p => this.workspaceDocsGQL.fetch({ path: p.path })),
        map(p => p.data.workspace.docs.workspaceDocs)
      )
    : of([]);

  readonly projectFilterFormControl = new FormControl('');
  readonly schematicFilterFormControl = new FormControl('');

  readonly filteredCollections$: Observable<
    WorkspaceSchematics.SchematicCollections[]
  > = combineLatest([
    this.workspace$,
    this.schematicFilterFormControl.valueChanges.pipe(
      startWith(this.schematicFilterFormControl.value)
    )
  ]).pipe(
    map(([workspace, filterValue]) => {
      if (!filterValue) {
        return workspace.schematicCollections;
      }

      filterValue = filterValue.toLowerCase();

      return workspace.schematicCollections
        .map(collection => {
          const filteredSchematics = collection.name.includes(filterValue)
            ? collection.schematics
            : collection.schematics.filter(schematic =>
                schematic.name.includes(filterValue)
              );

          return {
            ...collection,
            schematics: filteredSchematics
          };
        })
        .filter(collection => Boolean(collection.schematics.length));
    }),
    shareReplay(1)
  );

  readonly projects$: Observable<Workspace.Projects[]> = this.workspace$.pipe(
    map(({ workspace }) => {
      const workspaceSettings = this.settings.getWorkspace(this.workspacePath);
      this.pinnedProjectNames =
        (workspaceSettings && workspaceSettings.pinnedProjectNames) || [];
      const projects = workspace.projects.map(p => {
        return {
          ...p,
          actions: this.createActions(p),
          links$: this.getLinksForProject(p),
          supportsGenerate: !(p.architect || []).find(a => a.name === 'e2e')
        };
      });
      return projects;
    })
  );

  readonly filteredProjects$: Observable<Workspace.Projects[]> = combineLatest([
    this.projectFilterFormControl.valueChanges.pipe(
      startWith(''),
      map(value => value.toLowerCase())
    ),
    this.projects$
  ]).pipe(
    map(([lowerCaseFilterValue, projects]) =>
      projects.filter((project: any) =>
        project.name.includes(lowerCaseFilterValue)
      )
    ),
    map(projects => {
      const pinned = projects.filter(project =>
        this.pinnedProjectNames.includes(project.name)
      );
      const unpinned = projects.filter(
        project => !this.pinnedProjectNames.includes(project.name)
      );
      return [...pinned, ...unpinned];
    })
  );

  viewportHeight$ = this.commandRunner.listAllCommands().pipe(
    map(c => Boolean(c.length > 0)),
    map(actionBarExpanded => {
      return `calc(100vh - ${this.viewportOffsetPx +
        (actionBarExpanded ? ACTION_BAR_HEIGHT_PX : 0)}px)`;
    }),
    shareReplay()
  );

  private readonly contextActionCloseSubscription = this.contextActionService.contextualActions$.subscribe(
    actions => {
      if (actions === null) {
        this.router.navigate(['./'], { relativeTo: this.activatedRoute });
        this.animationState.next('reveal');
      }
    }
  );

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly contextActionService: ContextualActionBarService,
    readonly settings: Settings,
    private readonly route: ActivatedRoute,
    private readonly workspaceGQL: WorkspaceGQL,
    private readonly workspaceDocsGQL: WorkspaceDocsGQL,
    private readonly commandRunner: CommandRunner,
    private readonly workspaceSchematicsGQL: WorkspaceSchematicsGQL,
    @Inject(IS_ELECTRON) private readonly isElectron: boolean
  ) {}

  ngOnInit() {
    // Make collection hot to remove jank on initial render.
    this.filteredCollections$.subscribe().unsubscribe();
    this.router.events
      .pipe(
        filter((e): e is NavigationStart => e instanceof NavigationStart),
        map(e => e.url),
        startWith(this.router.url)
      )
      .subscribe(url => {
        if (!url.endsWith('projects')) {
          this.animationState.next('hide');
        }
      });
  }

  ngOnDestroy() {
    this.contextActionCloseSubscription.unsubscribe();
  }

  trackByProjectRoot(_: number, project: Workspace.Projects) {
    return project.root;
  }

  trackByProjectLink(_: number, action: ProjectAction) {
    return action.link;
  }

  getLinksForProject(project: Workspace.Projects) {
    return this.filteredCollections$.pipe(
      map(collections =>
        collections.reduce(
          (allLinks, collection) => [
            ...allLinks,
            ...createLinksForCollection(project, collection)
          ],
          [] as ProjectAction[]
        )
      )
    );
  }

  onPinClick(p: Workspace.Projects) {
    this.pinnedProjectNames = toggleItemInArray(
      this.pinnedProjectNames || [],
      p.name
    );
    this.projectFilterFormControl.setValue(
      this.projectFilterFormControl.value || ''
    );
    this.settings.toggleProjectPin(this.workspacePath, p);
  }

  trackByName(p: Workspace.Projects) {
    return p.name;
  }

  private createActions(p: Workspace.Projects) {
    return [
      ...(p.architect || [])
        .map(task => {
          if (!task) {
            return undefined;
          }
          return createLinkForTask(p, task.name, task.name);
        })
        .filter(isDefinedProjectAction)
    ];
  }
}
