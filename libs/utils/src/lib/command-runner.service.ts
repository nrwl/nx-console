import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { concatMap, last, map, switchMap, takeWhile } from 'rxjs/operators';
import { interval, Observable, of } from 'rxjs';
import { Apollo } from 'apollo-angular';
import { Injectable } from '@angular/core';

export interface CommandOutput {
  status: string;
  stdout: string;
  stderr: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommandRunner {
  constructor(private apollo: Apollo) {}

  runCommand(mutation: DocumentNode, variables: {[key: string]: any}, extractCommand: (r: any) => any, onlyLast: boolean): Observable<CommandOutput> {
    return this.apollo.mutate({
      mutation,
      variables
    }).pipe(
      map(extractCommand),
      switchMap((command: string) => {
        return interval(500).pipe(
          switchMap(() => {
            return this.apollo.query({
              query: gql`
                query($command: String!) {
                  commandStatus(command: $command) {
                    status
                    stdout
                    stderr
                  } 
                }
               `,
              variables: {command}
            });
          }),
          map((r: any) => r.data.commandStatus),
          concatMap(r => {
            if (r.status !== 'inprogress') {
              return of(r, null);
            } else {
              return of(r);
            }
          }),
          takeWhile(r => r),
          onlyLast ? last() : map(r => r)
        );
      })
    );
  }
}

