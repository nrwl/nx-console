import { Injectable } from '@angular/core';
import { Field } from '@nxui/utils';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class Completions {
  constructor(private readonly apollo: Apollo) {}

  completionsFor(
    path: string,
    field: Field,
    input: string
  ): Observable<Array<string>> {
    return this.apollo
      .query({
        query: gql`
        query($path: String!, $input: String!) {
          workspace(path: $path) {
            completions {
              ${field.completion}(input: $input) {
                value
              }
            }
          }
        }
      `,
        variables: {
          path,
          input
        }
      })
      .pipe(
        map((v: any) => {
          return v.data.workspace.completions[field.completion as any].map(
            (r: any) => r.value
          );
        })
      );
  }
}
