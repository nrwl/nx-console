import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Field } from '@nxui/utils';
import gql from 'graphql-tag';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class Completions {
  constructor(private apollo: Apollo) {}

  completionsFor(path: string, field: Field, input: string) {
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
