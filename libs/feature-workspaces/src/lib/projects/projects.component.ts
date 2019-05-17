import {
  CommandRunner,
  Settings,
  toggleItemInArray
} from '@angular-console/utils';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Observable, of } from 'rxjs';
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
  ProjectAction,
  createLinksForCollection,
  isDefinedProjectAction,
  createLinkForTask,
  SCHEMATIC_COLLECTION_ERROR_RESPONSE
} from './projects.constants';

const ACTION_BAR_HEIGHT_PX = 52;
const VIEWPORT_OFFSET_PX = 102;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
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
          supportsGenerate:
            (p.projectType === 'application' || p.projectType === 'library') &&
            !(p.architect || []).find(a => a.name === 'e2e')
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
      return `calc(100vh - ${VIEWPORT_OFFSET_PX +
        (actionBarExpanded ? ACTION_BAR_HEIGHT_PX : 0)}px)`;
    }),
    shareReplay()
  );

  constructor(
    readonly settings: Settings,
    private readonly route: ActivatedRoute,
    private readonly workspaceGQL: WorkspaceGQL,
    private readonly workspaceDocsGQL: WorkspaceDocsGQL,
    private readonly commandRunner: CommandRunner,
    private readonly workspaceSchematicsGQL: WorkspaceSchematicsGQL
  ) {}

  ngOnInit() {
    // Make collection hot to remove jank on initial render.
    this.filteredCollections$.subscribe().unsubscribe();
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
