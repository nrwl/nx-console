import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { interval, Observable, of } from 'rxjs';
import { concatMap, last, map, switchMap, takeWhile } from 'rxjs/operators';

export interface CommandOutput {
  status: 'success' | 'failure' | 'inprogress';
  out: string;
}

const POLLING_INTERVAL_MILLIS = 500;

@Injectable({
  providedIn: 'root'
})
export class CommandRunner {
  constructor(private readonly apollo: Apollo) {}

  runCommand(
    mutation: DocumentNode,
    variables: { [key: string]: any },
    extractCommand: (r: any) => any,
    onlyLast: boolean
  ): Observable<CommandOutput> {
    return this.apollo
      .mutate({
        mutation,
        variables
      })
      .pipe(
        map(extractCommand),
        switchMap((command: string) => {
          return interval(POLLING_INTERVAL_MILLIS).pipe(
            switchMap(() => {
              return this.apollo.query({
                query: gql`
                  query($command: String!) {
                    commandStatus(command: $command) {
                      status
                      out
                    }
                  }
                `,
                variables: { command }
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

  stopAllCommands() {
    this.runCommand(
      gql`
        mutation($path: String!) {
          stop(path: $path) {
            result
          }
        }
      `,
      {
        path: ''
      },
      r => r,
      false
    ).subscribe(() => {});
  }
}
