import { Injectable } from '@angular/core';
import { Field, CompletetionValue } from '@nxui/utils';
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
  ): Observable<Array<CompletetionValue>> {
    return this.apollo
      .query({
        query: gql`
        query($path: String!, $input: String!) {
          workspace(path: $path) {
            completions {
              ${field.completion}(input: $input) {
                value,
                display
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
        map((v: any) => v.data.workspace.completions[field.completion as any])
      );
  }
}
