import { Component, OnInit, ViewChild } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { ActivatedRoute } from '@angular/router';
import gql from 'graphql-tag';
import { filter, map, startWith, switchMap } from 'rxjs/operators';
import { combineLatest, Observable } from 'rxjs';
import { MatSelectionList } from '@angular/material';
import { FormControl } from '@angular/forms';
import { Schematic, SchematicCollection } from '@nxui/utils';

@Component({
  selector: 'nxui-generate',
  templateUrl: './schematics.component.html',
  styleUrls: ['./schematics.component.scss']
})
export class SchematicsComponent implements OnInit {
  @ViewChild(MatSelectionList) schematicSelectionList: MatSelectionList;

  schematicCollections$: Observable<Array<SchematicCollection>>;

  selectedSchematic$: Observable<Schematic | null>;

  schematicFilterFormControl = new FormControl();

  constructor(private apollo: Apollo, private route: ActivatedRoute) {
  }

  ngOnInit() {
    // TODO: Remove this hack when material exposes this boolean as a public API.
    (this.schematicSelectionList.selectedOptions as any)._multiple = false;

    this.selectedSchematic$ = this.schematicSelectionList.selectionChange.pipe(
      map(change => (change.option.selected ? change.option.value : null))
    );

    this.schematicCollections$ = combineLatest(
      this.schematicFilterFormControl.valueChanges.pipe(startWith('')),
      this.route.params.pipe(
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
        })
      )
    ).pipe(
      map(([schematicFilterValue, r]: [string, any]) => {
        const f = schematicFilterValue.toLowerCase();
        const collections = (r as any).data.workspace.schematicCollections;
        return collections.map(c => {
          const s = c.schematics.filter(({ name }) => name.includes(schematicFilterValue)).sort((a, b) => a.name.localeCompare(b.name));
          return ({ ...c, schematics: s });
        });
      }),
      filter(collections => collections.filter(c => c.schematics.length > 0))
    );
  }

  trackByName(index: number, schematic: Schematic) {
    return `${schematic.collection}:${schematic.name}`;
  }
}
