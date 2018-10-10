import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { BehaviorSubject, interval, Observable, of } from 'rxjs';
import { concatMap, map, takeWhile } from 'rxjs/operators';
import { COMMANDS_POLLING } from './polling-constants';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';

export enum CommandStatus {
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  IN_PROGRESS = 'in-progress',
  TERMINATED = 'terminated'
}

export interface IncrementalCommandOutput {
  status: CommandStatus;
  outChunk: string;
  detailedStatus: any;
}

export interface CommandResponse {
  id: string;
  command: string;
  out: string;
  outChunk: string;
  detailedStatus: any;
  status: CommandStatus;
}

@Injectable({
  providedIn: 'root'
})
export class CommandRunner {
  readonly activeCommand$ = new BehaviorSubject(false);
  activeCommandId: string;

  constructor(
    private readonly apollo: Apollo,
    contextualActionBarService: ContextualActionBarService
  ) {
    contextualActionBarService.contextualActions$.subscribe(
      contextualActions => {
        if (!contextualActions) {
          this.activeCommandId = '';
          this.activeCommand$.next(false);
        }
      }
    );
  }

  runCommand(
    mutation: DocumentNode,
    variables: { [key: string]: any },
    dryRun: boolean
  ): Observable<IncrementalCommandOutput> {
    if (!dryRun) {
      this.activeCommand$.next(true);
    }
    return this.apollo
      .mutate({
        mutation,
        variables
      })
      .pipe(
        concatMap((res: any) => {
          const id = (Object.entries(res.data)[0][1] as any).id;

          this.activeCommandId = id;

          return interval(COMMANDS_POLLING).pipe(
            concatMap(() => {
              return this.apollo.query({
                query: gql`
                  query($id: String) {
                    commands(id: $id) {
                      status
                      outChunk
                      detailedStatus
                    }
                  }
                `,
                variables: { id }
              });
            }),
            map((r: any) => r.data.commands[0]),
            concatMap(cc => {
              const c = {
                ...cc,
                detailedStatus: cc.detailedStatus
                  ? JSON.parse(cc.detailedStatus)
                  : null
              };
              if (c.status !== 'in-progress') {
                if (!dryRun) {
                  this.activeCommand$.next(false);
                }
                return of(c, null);
              } else {
                return of(c);
              }
            }),
            takeWhile(r => !!r)
          );
        })
      );
  }

  listAllCommands(): Observable<CommandResponse[]> {
    return this.apollo
      .watchQuery({
        pollInterval: COMMANDS_POLLING,
        query: gql`
          {
            commands {
              id
              type
              status
              workspace
              command
            }
          }
        `
      })
      .valueChanges.pipe(map((r: any) => r.data.commands));
  }

  getCommand(id: string): Observable<CommandResponse> {
    // TODO: vsavkin refactor it such that we pull "out" once
    return this.apollo
      .watchQuery({
        query: gql`
          query($id: String) {
            commands(id: $id) {
              id
              type
              workspace
              command
              status
              out
              outChunk
              detailedStatus
            }
          }
        `,
        variables: { id }
      })
      .valueChanges.pipe(
        map((r: any) => {
          const c = r.data.commands[0];
          return {
            ...c,
            detailedStatus: c.detailedStatus
              ? JSON.parse(c.detailedStatus)
              : null
          };
        })
      );
  }

  stopCommand(id: string) {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation($id: String!) {
            stopCommand(id: $id) {
              result
            }
          }
        `,
        variables: { id }
      })
      .subscribe(() => {});
  }

  removeAllCommands() {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation {
            removeAllCommands {
              result
            }
          }
        `
      })
      .subscribe(() => {});
  }

  removeCommand(id: string) {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation($id: String!) {
            removeCommand(id: $id) {
              result
            }
          }
        `,
        variables: { id }
      })
      .subscribe(() => {});
  }

  restartCommand(id: string) {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation($id: String!) {
            restartCommand(id: $id) {
              result
            }
          }
        `,
        variables: { id }
      })
      .subscribe(() => {});
  }

  stopActiveCommand() {
    this.stopCommand(this.activeCommandId);
  }
}
