import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Project } from '@angular-console/schema';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { PROJECTS_POLLING } from '@angular-console/utils';
import { WorkspaceGQL } from '../generated/graphql';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
  workspace$: Observable<any>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly workspaceGQL: WorkspaceGQL
  ) {}

  ngOnInit() {
    this.workspace$ = this.route.params.pipe(
      map(m => m.path),
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
        const projects = w.projects.map((p: any) => {
          const actions = [
            ...createLinkForTask(p, 'serve', 'Serve'),
            ...createLinkForTask(p, 'test', 'Test'),
            ...createLinkForTask(p, 'build', 'Build'),
            ...createLinkForTask(p, 'e2e', 'E2E'),
            ...createLinkForCoreSchematic(p, 'component', 'Generate Component')
          ] as any[];
          return { ...p, actions };
        });
        return { ...w, projects };
      })
    );
  }

  trackByName(p: any) {
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
