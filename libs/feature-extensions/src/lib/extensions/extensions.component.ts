import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Extension, ExtensionGroup, Schematic } from '@angular-console/schema';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { combineLatest, Observable } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs/operators';
import { TaskCollection, TaskCollections, Task } from '@angular-console/ui';

interface ExtensionId {
  name: string | undefined;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-extensions',
  templateUrl: './extensions.component.html',
  styleUrls: ['./extensions.component.scss']
})
export class ExtensionsComponent {
  private readonly extensions$: Observable<
    Array<ExtensionGroup>
  > = this.route.params.pipe(
    map(m => m.path),
    switchMap(path => {
      return this.apollo.watchQuery({
        pollInterval: 5000,
        query: gql`
          query($path: String!) {
            workspace(path: $path) {
              extensions {
                name
              }
            }
            availableExtensions {
              name
              description
            }
          }
        `,
        variables: {
          path
        }
      }).valueChanges;
    }),
    map(r => {
      const availableExtensions: Array<Extension> = (r as any).data
        .availableExtensions;
      const installed: Array<Extension> = (r as any).data.workspace.extensions;
      const extensions = availableExtensions.map(a => {
        const i = installed.filter(ii => ii.name === a.name).length > 0;
        return {
          ...a,
          description: i ? `[Installed] ${a.description}` : a.description,
          installed: i
        };
      });
      return [{ name: 'Available Extensions', extensions }];
    })
  );

  private readonly selectedExtensionId$: Observable<
    ExtensionId
  > = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    startWith(null),
    map(() => {
      const firstChild = this.route.snapshot.firstChild;
      if (firstChild) {
        return {
          name: decodeURIComponent(firstChild.params.name)
        };
      }
      return {
        name: ''
      };
    }),
    distinctUntilChanged((a: ExtensionId, b: ExtensionId) => a.name === b.name)
  );

  readonly taskCollections$: Observable<
    TaskCollections<Schematic>
  > = combineLatest(this.extensions$, this.selectedExtensionId$).pipe(
    map(([extensions, selectedId]) => {
      const collections: Array<TaskCollection<Extension>> = extensions.map(
        group => ({
          collectionName: group.name,
          tasks: group.extensions.map(extension => ({
            taskName: extension.name,
            taskDescription: extension.description,
            task: extension
          }))
        })
      );

      const taskCollections: TaskCollections<Extension> = {
        selectedTask: this.findSelectedExtension(selectedId, collections),
        taskCollections: collections
      };

      return taskCollections;
    }),
    shareReplay(1)
  );

  constructor(
    private readonly apollo: Apollo,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  navigateToSelectedExtension(s: Extension | null) {
    if (s) {
      this.router.navigate([encodeURIComponent(s.name)], {
        relativeTo: this.route
      });
    } else {
      this.router.navigate(['.'], { relativeTo: this.route });
    }
  }

  findSelectedExtension(
    extensionId: ExtensionId,
    taskCollections: Array<TaskCollection<Extension>>
  ): Task<Extension> | null {
    if (!extensionId.name) {
      return null;
    }
    const selectedTask = taskCollections[0].tasks.find(
      task => task.taskName === extensionId.name
    );
    return selectedTask || null;
  }
}
