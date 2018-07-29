import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { BehaviorSubject, interval, Observable, of } from 'rxjs';
import { concatMap, last, map, switchMap, takeWhile } from 'rxjs/operators';

export interface CommandOutput {
  status: 'success' | 'failure' | 'inprogress';
  out: string;
}

const POLLING_INTERVAL_MILLIS = 100;

@Injectable({
  providedIn: 'root'
})
export class CommandRunner {
  readonly activeCommand$ = new BehaviorSubject(false);

  constructor(private readonly apollo: Apollo) {}

  runCommand(
    mutation: DocumentNode,
    variables: { [key: string]: any },
    onlyLast: boolean
  ): Observable<CommandOutput> {
    this.activeCommand$.next(true);
    return this.apollo
      .mutate({
        mutation,
        variables
      })
      .pipe(
        switchMap(() => {
          return interval(POLLING_INTERVAL_MILLIS).pipe(
            switchMap(() => {
              return this.apollo.query({
                query: gql`
                  query {
                    commandStatus {
                      status
                      out
                    }
                  }
                `
              });
            }),
            map((r: any) => r.data.commandStatus),
            concatMap(r => {
              if (r.status !== 'inprogress') {
                this.activeCommand$.next(false);
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

  stopCommand() {
    this.runCommand(
      gql`
        mutation {
          stop {
            result
          }
        }
      `,
      {},
      false
    ).subscribe(() => {});
  }
}
