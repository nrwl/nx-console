import { Injectable } from '@angular/core';
import { FetchResult } from 'apollo-link';
import { BehaviorSubject, interval, Observable, of } from 'rxjs';
import { concatMap, map, takeWhile } from 'rxjs/operators';
import { COMMANDS_POLLING } from './polling-constants';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import {
  GetCommandGQL,
  CommandsGQL,
  ListAllCommandsGQL,
  RemoveAllCommandsGQL,
  RemoveCommandGQL,
  RestartCommandGQL,
  StopCommandGQL
} from './generated/graphql';

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
    private readonly getCommandGQL: GetCommandGQL,
    private readonly commandsGQL: CommandsGQL,
    private readonly listAllCommandsGQL: ListAllCommandsGQL,
    private readonly removeAllCommandsGQL: RemoveAllCommandsGQL,
    private readonly removeCommandGQL: RemoveCommandGQL,
    private readonly restartCommandGQL: RestartCommandGQL,
    private readonly stopCommandGQL: StopCommandGQL,
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
    mutation: Observable<FetchResult>,
    dryRun: boolean
  ): Observable<IncrementalCommandOutput> {
    if (!dryRun) {
      this.activeCommand$.next(true);
    }
    return mutation.pipe(
      concatMap((res: any) => {
        const id = (Object.entries(res.data)[0][1] as any).id;

        this.activeCommandId = id;

        return interval(COMMANDS_POLLING).pipe(
          concatMap(() => this.commandsGQL.fetch({ id })),
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
    return this.listAllCommandsGQL
      .watch({}, { pollInterval: COMMANDS_POLLING })
      .valueChanges.pipe(map((r: any) => r.data.commands));
  }

  getCommand(id: string): Observable<CommandResponse> {
    // TODO: vsavkin refactor it such that we pull "out" once
    return this.getCommandGQL.watch({ id }).valueChanges.pipe(
      map((r: any) => {
        const c = r.data.commands[0];
        return {
          ...c,
          detailedStatus: c.detailedStatus ? JSON.parse(c.detailedStatus) : null
        };
      })
    );
  }

  stopCommand(id: string) {
    return this.stopCommandGQL
      .mutate({
        id
      })
      .subscribe(() => {});
  }

  removeAllCommands() {
    return this.removeAllCommandsGQL.mutate().subscribe(() => {});
  }

  removeCommand(id: string) {
    return this.removeCommandGQL
      .mutate({
        id
      })
      .subscribe(() => {});
  }

  restartCommand(id: string) {
    return this.restartCommandGQL
      .mutate({
        id
      })
      .subscribe(() => {});
  }

  stopActiveCommand() {
    this.stopCommand(this.activeCommandId);
  }
}
