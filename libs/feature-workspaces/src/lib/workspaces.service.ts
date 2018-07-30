import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import gql from 'graphql-tag';

@Injectable({
  providedIn: 'root'
})
export class WorkspacesService {
  constructor(
    private readonly apollo: Apollo,
    private readonly router: Router
  ) {}

  openWorkspace(path: string) {
    // this query is just a smoke check
    this.apollo
      .query({
        query: gql`
          query($path: String!) {
            workspace(path: $path) {
              name
            }
          }
        `,
        variables: {
          path
        }
      })
      .pipe(first())
      .subscribe(() => {
        this.router.navigate(['/workspace', path]);
      });
  }
}
