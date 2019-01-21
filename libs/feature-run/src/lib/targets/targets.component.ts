import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Task, TaskCollection, TaskCollections } from '@angular-console/ui';
import { NpmScripts, Project } from '@angular-console/schema';
import { Observable, combineLatest } from 'rxjs';
import {
  map,
  switchMap,
  filter,
  startWith,
  distinctUntilChanged
} from 'rxjs/operators';
import {
  RouterNavigationService,
  TARGET_POLLING
} from '@angular-console/utils';
import { WorkspaceAndProjectsGQL } from '../generated/graphql';
import { Location } from '@angular/common';

interface Target {
  projectName: string;
  targetName: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-targets',
  templateUrl: './targets.component.html',
  styleUrls: ['./targets.component.scss']
})
export class TargetsComponent {
  private readonly projectsAndNpmScripts$: Observable<
    Array<Project | NpmScripts>
  > = this.route.params.pipe(
    map(m => m.path),
    switchMap(path => {
      return this.workspaceAndProjectsGQL.watch(
        {
          path
        },
        {
          pollInterval: TARGET_POLLING
        }
      ).valueChanges;
    }),
    map(r => {
      const sortedProjects = (r as any).data.workspace.projects
        .map((c: any) => {
          const s = [...c.architect].sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          return { ...c, architect: s };
        })
        .filter((p: any) => p.architect.length > 0);

      const scripts = {
        name: 'package.json scripts',
        scripts: (r as any).data.workspace.npmScripts
      };
      return [scripts, ...sortedProjects];
    })
  );

  private readonly selectedTargetId$: Observable<
    Target
  > = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    startWith(null),
    map(() => {
      const firstChild = this.route.snapshot.firstChild;
      if (firstChild) {
        if (firstChild.params.script) {
          return {
            projectName: 'package.json scripts',
            targetName: decodeURIComponent(firstChild.params.script)
          };
        } else {
          return {
            projectName: decodeURIComponent(firstChild.params.project),
            targetName: decodeURIComponent(firstChild.params.target)
          };
        }
      }
      return {
        projectName: '',
        targetName: ''
      };
    }),
    distinctUntilChanged(
      (a: Target, b: Target) =>
        a.projectName === b.projectName && a.targetName === b.targetName
    )
  );

  readonly taskCollections$: Observable<
    TaskCollections<Target>
  > = combineLatest(this.projectsAndNpmScripts$, this.selectedTargetId$).pipe(
    map(([projects, target]) => {
      const collections: Array<TaskCollection<Target>> = projects.map(
        projectOrScripts => {
          if ((projectOrScripts as any).projectType) {
            const project = projectOrScripts as Project;
            return {
              collectionName: project.name,
              tasks: project.architect.map(builder => ({
                taskName: builder.name,
                task: {
                  projectName: project.name,
                  targetName: builder.name
                }
              }))
            };
          } else {
            const scripts = projectOrScripts as NpmScripts;
            return {
              collectionName: projectOrScripts.name,
              tasks: scripts.scripts.map(script => ({
                taskName: script.name,
                task: {
                  projectName: scripts.name,
                  targetName: script.name
                }
              }))
            };
          }
        }
      );

      const taskCollections: TaskCollections<Target> = {
        selectedTask: this.getSelectedTask(collections, target),
        taskCollections: collections
      };

      return taskCollections;
    })
  );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly workspaceAndProjectsGQL: WorkspaceAndProjectsGQL,
    private readonly locationExt: RouterNavigationService
  ) {}

  navigateToSelectedTarget(target: Target | null) {
    if (target && isNpmScript(target)) {
      this.router.navigate(['script', encodeURIComponent(target.targetName)], {
        relativeTo: this.route
      });
    } else if (target) {
      this.router.navigate(
        [
          encodeURIComponent(target.targetName),
          encodeURIComponent(target.projectName)
        ],
        { relativeTo: this.route }
      );
    } else {
      this.locationExt.goBackOrNavigateToFallback(['.'], {
        relativeTo: this.route
      });
    }
  }

  getSelectedTask(
    taskCollections: Array<TaskCollection<Target>>,
    target: Target
  ): Task<Target> | null {
    if (!target.projectName || !target.targetName) {
      return null;
    }

    const selectedTask = taskCollections
      .reduce(
        (targets, collection) => [...targets, ...collection.tasks],
        [] as Array<Task<Target>>
      )
      .find(
        ({ task }) =>
          task.projectName === target.projectName &&
          task.targetName === target.targetName
      );

    return selectedTask || null;
  }
}

function isNpmScript(target: Target) {
  return target.projectName.indexOf('package.json') > -1;
}
