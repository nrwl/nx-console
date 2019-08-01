import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { FetchResult } from 'apollo-link';
import { BehaviorSubject, concat, interval, Observable, of } from 'rxjs';
import {
  concatMap,
  first,
  map,
  skip,
  switchMap,
  take,
  takeWhile,
  withLatestFrom
} from 'rxjs/operators';

import {
  GetCommandGQL,
  GetCommandInitialGQL,
  ListAllCommands,
  ListAllCommandsGQL,
  RemoveAllCommandsGQL,
  RemoveCommandGQL,
  RestartCommandGQL,
  StopCommandGQL
} from './generated/graphql';
import { COMMAND_LIST_POLLING, COMMANDS_POLLING } from './polling-constants';

export { ListAllCommands };
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
  readonly refreshList$ = new BehaviorSubject(null);

  constructor(
    private readonly getCommandInitialGQL: GetCommandInitialGQL,
    private readonly getCommandGQL: GetCommandGQL,
    private readonly listAllCommandsGQL: ListAllCommandsGQL,
    private readonly removeAllCommandsGQL: RemoveAllCommandsGQL,
    private readonly removeCommandGQL: RemoveCommandGQL,
    private readonly restartCommandGQL: RestartCommandGQL,
    private readonly stopCommandGQL: StopCommandGQL,
    private readonly snackbar: MatSnackBar,
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
    dryRun: boolean,
    cols$: Observable<number>
  ): Observable<IncrementalCommandOutput> {
    if (!dryRun) {
      this.activeCommand$.next(true);
    }
    return mutation.pipe(
      concatMap((res: any) => {
        const id = (Object.entries(res.data)[0][1] as any).id;

        this.activeCommandId = id;

        return interval(COMMANDS_POLLING).pipe(
          withLatestFrom(cols$),
          concatMap(([_, cols]) => this.getCommandGQL.fetch({ id, cols })),
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

  listAllCommands(): Observable<ListAllCommands.Commands[]> {
    return this.refreshList$.pipe(
      switchMap(() => {
        return this.listAllCommandsGQL
          .watch({}, { pollInterval: COMMAND_LIST_POLLING })
          .valueChanges.pipe(map(r => r.data.commands));
      })
    );
  }

  getCommand(
    id: string,
    cols$: Observable<number>
  ): Observable<CommandResponse> {
    // Start initial `outChunk` with `out` so we can replay terminal output.
    const initial$ = cols$.pipe(
      first(),
      concatMap(cols => this.getCommandInitialGQL.fetch({ id, cols })),
      map(withDetailedStatus),
      map(r => ({
        ...r,
        outChunk: r.out
      })),
      take(1)
    );

    const rest$ = interval(COMMANDS_POLLING).pipe(
      withLatestFrom(cols$),
      concatMap(([_, cols]) => this.getCommandGQL.fetch({ id, cols })),
      map(withDetailedStatus),
      skip(1),
      takeWhile(r => !!r)
    );

    return concat(initial$, rest$);
  }

  stopCommand(id: string) {
    return this.stopCommandGQL
      .mutate({
        id
      })
      .subscribe(() => {
        this.refreshList$.next(null);
      });
  }

  stopCommandViaCtrlC(id: string) {
    this.stopCommand(id).add(() => {
      this.snackbar.open('Command has been terminated via ctrl-c', undefined, {
        duration: 1500
      });
    });
  }

  removeAllCommands() {
    return this.removeAllCommandsGQL.mutate().subscribe(() => {
      this.refreshList$.next(null);
    });
  }

  removeCommand(id: string) {
    return this.removeCommandGQL
      .mutate({
        id
      })
      .subscribe(() => {
        this.refreshList$.next(null);
      });
  }

  restartCommand(id: string) {
    return this.restartCommandGQL
      .mutate({
        id
      })
      .subscribe(() => {
        this.refreshList$.next(null);
      });
  }

  stopActiveCommand() {
    this.stopCommand(this.activeCommandId);
  }
}

function withDetailedStatus(r: any) {
  const c = r.data.commands[0];
  return c
    ? {
        ...c,
        detailedStatus: c.detailedStatus ? JSON.parse(c.detailedStatus) : null
      }
    : null;
}
