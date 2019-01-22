import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Observable, of } from 'rxjs';
import {
  map,
  startWith,
  switchMap,
  shareReplay,
  filter,
  catchError,
  tap
} from 'rxjs/operators';
import {
  PROJECTS_POLLING,
  Settings,
  CommandRunner,
  toggleItemInArray
} from '@angular-console/utils';
import {
  WorkspaceDocsGQL,
  WorkspaceGQL,
  SaveRecentActionGQL,
  WorkspaceSchematicsGQL,
  WorkspaceSchematics,
  Workspace
} from '../generated/graphql';
import { FormControl } from '@angular/forms';

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
  filteredProjects$: Observable<Workspace.Projects[]>;
  filteredPinnedProjects$: Observable<Workspace.Projects[]>;
  filteredUnpinnedProjects$: Observable<Workspace.Projects[]>;
  docs$ = this.settings.showDocs
    ? this.route.params.pipe(
        switchMap(p => this.workspaceDocsGQL.fetch({ path: p.path })),
        map(p => p.data.workspace.docs.workspaceDocs)
      )
    : of([]);

  projectFilterFormControl = new FormControl();

  viewportHeight$ = this.commandRunner.listAllCommands().pipe(
    map(c => Boolean(c.length > 0)),
    map(actionBarExpanded => {
      return actionBarExpanded ? `calc(100vh - 194px)` : `calc(100vh - 128px)`;
    }),
    shareReplay()
  );

  recentActions$: Observable<ProjectActionMap>;

  constructor(
    readonly settings: Settings,
    private readonly route: ActivatedRoute,
    private readonly workspaceGQL: WorkspaceGQL,
    private readonly workspaceDocsGQL: WorkspaceDocsGQL,
    private readonly saveRecentActionGQL: SaveRecentActionGQL,
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
    this.projects$ = workspace$.pipe(
      map(({ workspace, schematicCollections }) => {
        const workspaceSettings = this.settings.getWorkspace(
          this.workspacePath
        );
        this.pinnedProjectNames =
          (workspaceSettings && workspaceSettings.pinnedProjectNames) || [];
        const projects = workspace.projects.map((p: any) => {
          return {
            ...p,
            actions: this.createActions(p, schematicCollections)
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
      )
    );

    const MAX_RECENT_ACTIONS = 5;
    this.recentActions$ = this.projects$.pipe(
      map(projects => {
        return projects.reduce<ProjectActionMap>(
          (projectActions, nextProject) => {
            const recentActions = nextProject.recentActions
              .map(recentAction =>
                (nextProject as any).actions.find(
                  (action: ProjectAction) =>
                    action.name === recentAction.actionName &&
                    action.schematicName === recentAction.schematicName
                )
              )
              .filter(action => action !== undefined);
            projectActions[nextProject.name] = [
              ...recentActions,
              ...(nextProject as any).actions.filter(
                (action: ProjectAction) =>
                  action.link !== undefined && !recentActions.includes(action)
              )
            ].slice(0, MAX_RECENT_ACTIONS);
            return projectActions;
          },
          {}
        );
      })
    );
    this.filteredPinnedProjects$ = this.filteredProjects$.pipe(
      map(projects =>
        projects.filter(project =>
          this.pinnedProjectNames.includes(project.name)
        )
      )
    );
    this.filteredUnpinnedProjects$ = this.filteredProjects$.pipe(
      map(projects =>
        projects.filter(
          project => !this.pinnedProjectNames.includes(project.name)
        )
      )
    );
  }

  onActionTriggered(
    workspacePath: string,
    project: Workspace.Projects,
    action: ProjectAction
  ) {
    this.saveRecentActionGQL
      .mutate({
        workspacePath: workspacePath,
        projectName: project.name,
        schematicName: action.schematicName,
        actionName: action.name
      })
      .subscribe();
  }

  private createActions(
    p: Workspace.Projects,
    schematicCollections: WorkspaceSchematics.SchematicCollections[]
  ) {
    return [
      { actionDescription: 'Tasks' },
      ...(p.architect || [])
        .map(task => {
          if (!task) {
            return undefined;
          }
          return createLinkForTask(p, task.name, task.name);
        })
        .filter(isDefinedProjectAction),
      ...schematicCollections.reduce<any[]>((links, collection) => {
        links.push(...createLinksForCollection(p, collection));
        return links;
      }, [])
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
        '@schematics/angular',
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