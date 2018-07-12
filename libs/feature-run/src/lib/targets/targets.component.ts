import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Task, TaskCollection, TaskCollections } from '@nxui/ui';
import { NpmScripts, Project } from '@nxui/utils';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

interface Target {
  projectName: string;
  targetName: string;
}

@Component({
  selector: 'nxui-targets',
  templateUrl: './targets.component.html',
  styleUrls: ['./targets.component.scss']
})
export class TargetsComponent {
  private readonly projectsAndNpmScripts$: Observable<
    Array<Project | NpmScripts>
  > = this.route.params.pipe(
    map(m => m.path),
    switchMap(path => {
      return this.apollo.watchQuery({
        pollInterval: 5000,
        query: gql`
          query($path: String!) {
            workspace(path: $path) {
              npmScripts {
                name
              }

              projects {
                name
                root
                projectType
                architect {
                  name
                  project
                }
              }
            }
          }
        `,
        variables: {
          path
        }
      }).valueChanges;
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

  readonly taskCollections$: Observable<
    TaskCollections<Target>
  > = this.projectsAndNpmScripts$.pipe(
    map(projects => {
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
        selectedTask: this.getSelectedTarget(collections),
        taskCollections: collections
      };

      return taskCollections;
    })
  );

  constructor(
    private readonly apollo: Apollo,
    private readonly route: ActivatedRoute,
    private readonly router: Router
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
      this.router.navigate(['.'], { relativeTo: this.route });
    }
  }

  getSelectedTarget(
    taskCollections: Array<TaskCollection<Target>>
  ): Task<Target> | null {
    const projectName = this.route.snapshot.params.project;
    const targetName = this.route.snapshot.params.target;
    if (!projectName || !targetName) {
      return null;
    }

    const selectedTask = taskCollections
      .reduce(
        (targets, collection) => [...targets, ...collection.tasks],
        [] as Array<Task<Target>>
      )
      .find(
        ({ task }) =>
          task.projectName === projectName && task.targetName === targetName
      );

    return selectedTask || null;
  }
}

function isNpmScript(target: Target) {
  return target.projectName.indexOf('package.json') > -1;
}
