import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Task, TaskCollection, TaskCollections } from '@nxui/ui';
import { Project } from '@nxui/utils';
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
  private readonly projects$: Observable<
    Array<Project>
  > = this.route.params.pipe(
    map(m => m['path']),
    switchMap(path => {
      return this.apollo.watchQuery({
        pollInterval: 5000,
        query: gql`
          query($path: String!) {
            workspace(path: $path) {
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
      const projects: Array<Project> = (r as any).data.workspace.projects;
      return projects
        .map(c => {
          const s = [...c.architect].sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          return { ...c, architect: s };
        })
        .filter(p => p.architect.length > 0);
    })
  );

  readonly taskCollections$: Observable<
    TaskCollections<Target>
  > = this.projects$.pipe(
    map(projects => {
      const collections: Array<TaskCollection<Target>> = projects.map(
        project => ({
          collectionName: project.name,
          tasks: project.architect.map(builder => ({
            taskName: builder.name,
            task: {
              projectName: project.name,
              targetName: builder.name
            }
          }))
        })
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
    if (target) {
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
