import { Component, OnInit, ViewChild } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { ActivatedRoute } from '@angular/router';
import gql from 'graphql-tag';
import { map, switchMap, startWith, combineLatest } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { MatSelectionListChange, MatSelectionList } from '@angular/material';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'nxui-generate',
  templateUrl: './schematics.component.html',
  styleUrls: ['./schematics.component.scss']
})
export class SchematicsComponent implements OnInit {
  @ViewChild(MatSelectionList) schematicSelectionList: MatSelectionList;

  schematicCollections$: Observable<Array<SchematicDescriptionColltion>>;

  selectedSchematic$: Observable<SchematicDescription | null>;

  schematicFilterFormControl = new FormControl();

  constructor(private apollo: Apollo, private route: ActivatedRoute) {}

  ngOnInit() {
    document.querySelector('.schematic-list')!.addEventListener(
      'sticky-change',
      e => {
        debugger;
        // const header = e.detail.target;  // header became sticky or stopped sticking.
        // const sticking = e.detail.stuck; // true when header is sticky.
        // header.classList.toggle('shadow', sticking); // add drop shadow when sticking.
      }
    );

    // TODO: Remove this hack when material exposes this boolean as a public API.
    (this.schematicSelectionList.selectedOptions as any)._multiple = false;

    this.selectedSchematic$ = this.schematicSelectionList.selectionChange.pipe(
      map(change => (change.option.selected ? change.option.value : null))
    );

    this.schematicCollections$ = this.route.params.pipe(
      map(m => m['path']),
      switchMap(path => {
        return this.apollo.watchQuery({
          pollInterval: 5000,
          query: gql`
            query($path: String!) {
              workspace(path: $path) {
                schematics {
                  collection
                  name
                  description
                }
              }
            }
          `,
          variables: {
            path
          }
        }).valueChanges;
      }),
      combineLatest(
        this.schematicFilterFormControl.valueChanges.pipe(startWith(''))
      ),
      map(([r, schemaicFilterValue]: [any, string]) => {
        schemaicFilterValue = schemaicFilterValue.toLowerCase();
        const schematics: Array<SchematicDescription> = (r as any).data
          .workspace.schematics;
        return schematics.filter(({ name }) =>
          name.includes(schemaicFilterValue)
        );
      }),
      map((schematics: Array<SchematicDescription>) => {
        const collections = new Map<string, Set<SchematicDescription>>();
        schematics.forEach(schematic => {
          if (!collections.has(schematic.collection)) {
            collections.set(schematic.collection, new Set());
          }
          collections.get(schematic.collection)!.add(schematic);
        });

        return (
          Array.from(collections.entries())
            .map(([collection, schematics]) => {
              const schematicColltion: SchematicDescriptionColltion = {
                name: collection,
                schematics: Array.from(schematics).sort((a, b) =>
                  a.name.localeCompare(b.name)
                )
              };
              return schematicColltion;
            })
            /**
             * TODO: The ordering should be as follows.
             *   First element is projects default collection
             *   Second element is @schematics/angular if it wasn't the default
             *   The rest follow in alphabetical order.
             */
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      })
    );
  }
}
