import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { BehaviorSubject, interval, Observable, of } from 'rxjs';
import { concatMap, last, map, takeWhile } from 'rxjs/operators';

export interface CommandOutput {
  status: 'success' | 'failure' | 'inprogress';
  out: string;
  detailedStatus: any;
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
    dryRun: boolean
  ): Observable<CommandOutput> {
    if (!dryRun) {
      this.activeCommand$.next(true);
    }
    return this.apollo
      .mutate({
        mutation,
        variables
      })
      .pipe(
        concatMap(() => {
          return interval(POLLING_INTERVAL_MILLIS).pipe(
            concatMap(() => {
              return this.apollo.query({
                query: gql`
                  query {
                    commandStatus {
                      status
                      out
                      detailedStatus
                    }
                  }
                `
              });
            }),
            map((r: any) => r.data.commandStatus),
            concatMap(r => {
              const rr = {
                ...r,
                detailedStatus: r.detailedStatus
                  ? JSON.parse(r.detailedStatus)
                  : null
              };
              if (rr.status !== 'inprogress') {
                if (!dryRun) {
                  this.activeCommand$.next(false);
                }
                return of(rr, null);
              } else {
                return of(rr);
              }
            }),
            takeWhile(r => r),
            dryRun ? last() : map(r => r)
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
