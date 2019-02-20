import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Project } from '@angular-console/schema';
import { combineLatest, Observable, of } from 'rxjs';
import { map, startWith, switchMap, shareReplay, tap } from 'rxjs/operators';
import {
  PROJECTS_POLLING,
  Settings,
  CommandRunner,
  toggleItemInArray
} from '@angular-console/utils';
import { WorkspaceDocsGQL, WorkspaceGQL } from '../generated/graphql';
import { FormControl } from '@angular/forms';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
  workspacePath: string;
  pinnedProjectNames: string[];
  projects$: Observable<Project[]>;
  filteredProjects$: Observable<Project[]>;
  filteredPinnedProjects$: Observable<Project[]>;
  filteredUnpinnedProjects$: Observable<Project[]>;
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

  constructor(
    readonly settings: Settings,
    private readonly route: ActivatedRoute,
    private readonly workspaceGQL: WorkspaceGQL,
    private readonly workspaceDocsGQL: WorkspaceDocsGQL,
    private readonly commandRunner: CommandRunner
  ) {}

  ngOnInit() {
    this.projects$ = this.route.params.pipe(
      map(m => m.path),
      tap(path => {
        this.workspacePath = path;
      }),
      switchMap(path => {
        return this.workspaceGQL.watch(
          {
            path
          },
          {
            pollInterval: PROJECTS_POLLING
          }
        ).valueChanges;
      }),
      map((r: any) => {
        const w = r.data.workspace;
        const workspaceSettings = this.settings.getWorkspace(
          this.workspacePath
        );
        this.pinnedProjectNames =
          (workspaceSettings && workspaceSettings.pinnedProjectNames) || [];
        const projects: Project[] = w.projects.map((p: Project) => {
          return {
            ...p,
            actions: this.createActions(p)
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

  private createActions(p: any) {
    return [
      ...createLinkForTask(p, 'serve', 'Serve'),
      ...createLinkForTask(p, 'test', 'Test'),
      ...createLinkForTask(p, 'build', 'Build'),
      ...createLinkForTask(p, 'e2e', 'E2E'),
      ...createLinkForCoreSchematic(p, 'component', 'Generate Component')
    ] as any[];
  }

  onPinClick(p: Project) {
    this.pinnedProjectNames = toggleItemInArray(
      this.pinnedProjectNames || [],
      p.name
    );
    this.projectFilterFormControl.setValue(
      this.projectFilterFormControl.value || ''
    );
    this.settings.toggleProjectPin(this.workspacePath, p);
  }

  trackByName(p: Project) {
    return p.name;
  }
}

function createLinkForTask(
  project: Project,
  name: string,
  actionDescription: string
) {
  if (project.architect.find(a => a.name === name)) {
    return [{ actionDescription, link: ['../tasks', name, project.name] }];
  } else {
    return [];
  }
}

function createLinkForCoreSchematic(
  project: Project,
  name: string,
  actionDescription: string
) {
  if (
    (project.projectType === 'application' ||
      project.projectType === 'library') &&
    !project.architect.find(a => a.name === 'e2e')
  ) {
    return [
      {
        actionDescription,
        link: [
          '../generate',
          decodeURIComponent('@schematics/angular'),
          name,
          { project: project.name }
        ]
      }
    ];
  } else {
    return [];
  }
}
