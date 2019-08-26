import { Schematic, SchematicCollection } from '@angular-console/schema';
import { Task, TaskCollection, TaskCollections } from '@angular-console/ui';
import { RouterNavigation, Telemetry } from '@angular-console/utils';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { combineLatest, Observable } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs/operators';

import { SchematicCollectionsGQL } from '../generated/graphql';

interface SchematicId {
  collectionName: string | undefined;
  schematicName: string | undefined;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-generate',
  templateUrl: './schematics.component.html'
})
export class SchematicsComponent implements OnInit {
  private readonly schematicCollections$: Observable<
    Array<SchematicCollection>
  > = this.route.params.pipe(
    map(m => m.path),
    switchMap(path => {
      return this.schematicCollectionsGQL.fetch({
        path
      });
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
  > = combineLatest([
    this.schematicCollections$,
    this.selectedSchematicId$
  ]).pipe(
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
    private readonly telemetry: Telemetry,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly schematicCollectionsGQL: SchematicCollectionsGQL,
    private readonly locationExt: RouterNavigation
  ) {}

  ngOnInit() {
    this.telemetry.screenViewed('Generate');
  }

  navigateToSelectedSchematic(s: Schematic | null) {
    if (s) {
      this.router.navigate(
        [encodeURIComponent(s.collection), encodeURIComponent(s.name)],
        { relativeTo: this.route }
      );
    } else {
      this.locationExt.navigateToPrevious(['.'], {
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
