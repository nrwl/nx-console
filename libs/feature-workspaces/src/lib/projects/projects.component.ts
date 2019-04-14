import {
  CommandRunner,
  PROJECTS_POLLING,
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

export interface ProjectAction {
  name: string;
  actionDescription: string;
  schematicName?: string;
  link?: (string | { project: string })[];
}
export interface ProjectActionMap {
  [projectName: string]: ProjectAction[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
  workspacePath: string;
  pinnedProjectNames: string[];
  projects$: Observable<Workspace.Projects[]>;
  filteredCollections$: Observable<WorkspaceSchematics.SchematicCollections[]>;
  filteredProjects$: Observable<Workspace.Projects[]>;
  filteredPinnedProjects$: Observable<Workspace.Projects[]>;
  filteredUnpinnedProjects$: Observable<Workspace.Projects[]>;
  docs$ = this.settings.showDocs
    ? this.route.params.pipe(
        switchMap(p => this.workspaceDocsGQL.fetch({ path: p.path })),
        map(p => p.data.workspace.docs.workspaceDocs)
      )
    : of([]);

  projectFilterFormControl = new FormControl('');
  schematicFilterFormControl = new FormControl('');

  viewportHeight$ = this.commandRunner.listAllCommands().pipe(
    map(c => Boolean(c.length > 0)),
    map(actionBarExpanded => {
      return actionBarExpanded ? `calc(100vh - 154px)` : `calc(100vh - 102px)`;
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
    const workspace$ = this.route.params.pipe(
      map(m => m.path),
      tap(path => {
        this.workspacePath = path;
      }),
      switchMap(path => {
        return combineLatest(
          this.workspaceGQL.watch(
            {
              path
            },
            {
              pollInterval: PROJECTS_POLLING
            }
          ).valueChanges,
          this.workspaceSchematicsGQL
            .watch({ path }, { pollInterval: PROJECTS_POLLING })
            .valueChanges.pipe(
              catchError(() =>
                of({
                  data: {
                    workspace: {
                      schematicCollections: [] as WorkspaceSchematics.SchematicCollections[]
                    }
                  }
                })
              )
            )
        );
      }),
      filter(([r1, r2]) => Boolean(r1 && r2)),
      map(([r1, r2]) => {
        return {
          workspace: r1.data.workspace,
          schematicCollections: r2.data.workspace.schematicCollections
        };
      })
    );
    this.filteredCollections$ = combineLatest(
      workspace$,
      this.schematicFilterFormControl.valueChanges.pipe(
        startWith(this.schematicFilterFormControl.value)
      )
    ).pipe(
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

    // Make collection hot to remove jank on initial render.
    this.filteredCollections$.subscribe().unsubscribe();

    this.projects$ = workspace$.pipe(
      map(({ workspace }) => {
        const workspaceSettings = this.settings.getWorkspace(
          this.workspacePath
        );
        this.pinnedProjectNames =
          (workspaceSettings && workspaceSettings.pinnedProjectNames) || [];
        const projects = workspace.projects.map(p => {
          return {
            ...p,
            actions: this.createActions(p),
            links$: this.getLinksForProject(p),
            supportsGenerate:
              (p.projectType === 'application' ||
                p.projectType === 'library') &&
              !(p.architect || []).find(a => a.name === 'e2e')
          };
        });
        return projects;
      })
    );

    this.filteredProjects$ = combineLatest(
      this.projectFilterFormControl.valueChanges.pipe(
        startWith(''),
        map(value => value.toLowerCase())
      ),
      this.projects$
    ).pipe(
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
}

function createLinkForTask(
  project: Workspace.Projects,
  name: string,
  actionDescription: string
) {
  if ((project.architect || []).find(a => a.name === name)) {
    return { actionDescription, name, link: ['../tasks', name, project.name] };
  } else {
    return undefined;
  }
}

function createLinksForCollection(
  project: Workspace.Projects,
  collection: WorkspaceSchematics.SchematicCollections
): ProjectAction[] {
  const newLinks = (collection.schematics || [])
    .map(schematic =>
      createLinkForSchematic(
        project,
        collection.name,
        schematic ? schematic.name : '',
        schematic ? schematic.name : ''
      )
    )
    .filter(isDefinedProjectAction);
  if (newLinks.length > 0) {
    newLinks.unshift({
      name: collection.name,
      actionDescription: collection.name
    });
  }
  return newLinks;
}

function createLinkForSchematic(
  project: Workspace.Projects,
  schematicName: string,
  name: string,
  actionDescription: string
): ProjectAction | undefined {
  if (
    (project.projectType === 'application' ||
      project.projectType === 'library') &&
    !(project.architect || []).find(a => a.name === 'e2e')
  ) {
    return {
      name,
      schematicName,
      actionDescription,
      link: [
        '../generate',
        decodeURIComponent(schematicName),
        name,
        { project: project.name }
      ]
    };
  } else {
    return undefined;
  }
}

function isDefinedProjectAction(
  action: ProjectAction | undefined
): action is ProjectAction {
  return action !== undefined;
}
