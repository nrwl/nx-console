import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Task, TaskCollection, TaskCollections } from '@angular-console/ui';
import { SchematicCollection, Schematic } from '@angular-console/schema';
import { combineLatest, Observable } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap
} from 'rxjs/operators';
import { LocationExt, SCHEMATICS_POLLING } from '@angular-console/utils';
import { SchematicCollectionsGQL } from '../generated/graphql';
import { Location } from '@angular/common';

interface SchematicId {
  collectionName: string | undefined;
  schematicName: string | undefined;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-generate',
  templateUrl: './schematics.component.html',
  styleUrls: ['./schematics.component.scss']
})
export class SchematicsComponent {
  private readonly schematicCollections$: Observable<
    Array<SchematicCollection>
  > = this.route.params.pipe(
    map(m => m.path),
    switchMap(path => {
      return this.schematicCollectionsGQL.watch(
        {
          path
        },
        {
          pollInterval: SCHEMATICS_POLLING
        }
      ).valueChanges;
    }),
    map(r => {
      const collections: Array<SchematicCollection> = (r as any).data.workspace
        .schematicCollections;
      return collections.filter(c => c.schematics.length > 0);
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
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly schematicCollectionsGQL: SchematicCollectionsGQL,
    private readonly locationExt: LocationExt
  ) {}

  navigateToSelectedSchematic(s: Schematic | null) {
    if (s) {
      this.router.navigate(
        [encodeURIComponent(s.collection), encodeURIComponent(s.name)],
        { relativeTo: this.route }
      );
    } else {
      this.locationExt.goBackOrNavigateToFallback(['.'], {
        relativeTo: this.route
      });
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
