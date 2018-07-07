import { Component } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Task, TaskCollection, TaskCollections } from '@nxui/ui';
import { Schematic, SchematicCollection } from '@nxui/utils';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { Observable, combineLatest } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs/operators';

interface SchematicId {
  collectionName: string | undefined;
  schematicName: string | undefined;
}

@Component({
  selector: 'nxui-generate',
  templateUrl: './schematics.component.html',
  styleUrls: ['./schematics.component.scss']
})
export class SchematicsComponent {
  private readonly schematicCollections$: Observable<
    Array<SchematicCollection>
  > = this.route.params.pipe(
    map(m => m['path']),
    switchMap(path => {
      return this.apollo.watchQuery({
        pollInterval: 5000,
        query: gql`
          query($path: String!) {
            workspace(path: $path) {
              schematicCollections {
                name
                schematics {
                  name
                  description
                  collection
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
      const collections = (r as any).data.workspace.schematicCollections;
      return collections
        .map(c => {
          const s = [...c.schematics].sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          return { ...c, schematics: s };
        })
        .filter(c => c.schematics.length > 0);
    })
  );

  private readonly selectedSchematicId$: Observable<
    SchematicId
  > = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    startWith(null),
    map(() => {
      const firstChild = this.route.snapshot.firstChild;
      if (firstChild) {
        return {
          collectionName: decodeURIComponent(firstChild.params.collection),
          schematicName: decodeURIComponent(firstChild.params.schematic)
        };
      }
      return {
        collectionName: '',
        schematicName: ''
      };
    }),
    distinctUntilChanged(
      (a: SchematicId, b: SchematicId) =>
        a.collectionName === b.collectionName &&
        a.schematicName === b.schematicName
    )
  );

  readonly taskCollections$: Observable<
    TaskCollections<Schematic>
  > = combineLatest(this.schematicCollections$, this.selectedSchematicId$).pipe(
    map(([schematicCollections, selectedSchematicId]) => {
      const collections: Array<
        TaskCollection<Schematic>
      > = schematicCollections.map(schematicCollection => ({
        collectionName: schematicCollection.name,
        tasks: schematicCollection.schematics.map(schematic => ({
          taskName: schematic.name,
          task: schematic
        }))
      }));

      const taskCollections: TaskCollections<Schematic> = {
        selectedTask: this.findSelectedSchematic(
          selectedSchematicId,
          collections
        ),
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

  navigateToSelectedSchematic(s: Schematic | null) {
    if (s) {
      this.router.navigate(
        [encodeURIComponent(s.collection), encodeURIComponent(s.name)],
        { relativeTo: this.route }
      );
    } else {
      this.router.navigate(['.'], { relativeTo: this.route });
    }
  }

  findSelectedSchematic(
    schematicId: SchematicId,
    taskCollections: Array<TaskCollection<Schematic>>
  ): Task<Schematic> | null {
    if (!schematicId.collectionName || !schematicId.schematicName) {
      return null;
    }

    const selectedTaskCollection = taskCollections.find(
      collection => collection.collectionName === schematicId.collectionName
    );

    if (!selectedTaskCollection) {
      return null;
    }

    const selectedTask = selectedTaskCollection.tasks.find(
      task => task.taskName === schematicId.schematicName
    );

    return selectedTask || null;
  }
}
