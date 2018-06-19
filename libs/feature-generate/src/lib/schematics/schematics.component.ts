import { Component, OnInit } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { ActivatedRoute } from '@angular/router';
import gql from 'graphql-tag';
import { map, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';

type Schematic = { collection: string, name: string };

@Component({
  selector: 'nxui-generate',
  templateUrl: './schematics.component.html',
  styleUrls: ['./schematics.component.css']
})
export class SchematicsComponent implements OnInit {
  public schematics$: Observable<any>;

  constructor(private apollo: Apollo, private route: ActivatedRoute) { }

  ngOnInit() {
    this.schematics$ = this.route.params.pipe(
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
      map((r: any) => r.data.workspace.schematics)
    );
  }

  schematicUrl(schematic: Schematic) {
    return [encodeURIComponent(schematic.collection), encodeURIComponent(schematic.name)];
  }

  trackByName(index: number, schematic: Schematic) {
    return `${schematic.collection}:${schematic.name}`;
  }
}
