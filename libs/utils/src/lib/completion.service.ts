import { Injectable } from '@angular/core';
import { Schema, CompletionResultType } from '@angular-console/schema';
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
    field: Schema,
    input: string
  ): Observable<Array<CompletionResultType>> {
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
