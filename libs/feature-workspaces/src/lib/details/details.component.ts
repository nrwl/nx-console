import { Component, OnInit } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { ActivatedRoute } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';

@Component({
  selector: 'nxui-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.css']
})
export class DetailsComponent implements OnInit {
  public workspace$: Observable<any>;

  constructor(private apollo: Apollo, private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.workspace$ = this.route.params.pipe(
      map(m => m['path']),
      switchMap(path => {
        return this.apollo.watchQuery({
          pollInterval: 2000,
          query: gql`
            query($path: String!) {
              workspace(path: $path) {
                name
                path
                versions {
                  cli
                }
                projects {
                  name
                  root
                  projectType
                }
              }
            }
          `,
          variables: {
            path
          }
        }).valueChanges;
      }),
      map((r: any) => r.data.workspace)
    );
  }

  trackByName(p: any) {
    return p.name;
  }
}
