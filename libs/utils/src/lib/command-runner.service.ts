import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { concatMap, last, map, switchMap, takeWhile } from 'rxjs/operators';
import { BehaviorSubject, interval, Observable, of } from 'rxjs';
import { Apollo } from 'apollo-angular';
import { Injectable } from '@angular/core';

export interface CommandOutput {
  status: 'success' | 'failure' | 'inprogress';
  out: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommandRunner {
  busy = new BehaviorSubject(false);

  constructor(private readonly apollo: Apollo) {}

  runCommand(
    mutation: DocumentNode,
    variables: { [key: string]: any },
    extractCommand: (r: any) => any,
    dryRun: boolean
  ): Observable<CommandOutput> {
    return this.apollo
      .mutate({
        mutation,
        variables
      })
      .pipe(
        map(extractCommand),
        switchMap((command: string) => {
          if (!dryRun) {
            this.busy.next(true);
          }
          return interval(500).pipe(
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
                this.busy.next(false);
                return of(r, null);
              } else {
                return of(r);
              }
            }),
            takeWhile(r => r),
            dryRun ? last() : map(r => r)
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
