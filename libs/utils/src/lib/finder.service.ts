import { Injectable } from '@angular/core';
import { Directory } from '@angular-console/schema';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class Finder {
  constructor(private readonly apollo: Apollo) {}

  listFiles(
    path?: string,
    onlyDirectories?: boolean,
    showHidden?: boolean
  ): Observable<Directory> {
    return this.apollo
      .query({
        query: gql`
          query($path: String!, $onlyDirectories: Boolean) {
            directory(path: $path, onlyDirectories: $onlyDirectories) {
              path
              exists
              files {
                name
                type
              }
            }
          }
        `,
        variables: {
          path,
          onlyDirectories,
          showHidden
        }
      })
      .pipe(map((v: any) => v.data.directory));
  }
}
