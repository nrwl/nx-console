import { Injectable } from '@angular/core';
import { FetchResult } from 'apollo-link';
import { BehaviorSubject, interval, merge, Observable, of, concat } from 'rxjs';
import {
  concatMap,
  map,
  skip,
  take,
  takeWhile,
  first,
  flatMap,
  withLatestFrom
} from 'rxjs/operators';
import { COMMANDS_POLLING } from './polling-constants';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import {
  CommandsGQL,
  GetCommandGQL,
  GetCommandInitialGQL,
  ListAllCommandsGQL,
  RemoveAllCommandsGQL,
  RemoveCommandGQL,
  RestartCommandGQL,
  StopCommandGQL,
  ListAllCommands
} from './generated/graphql';
import { MatSnackBar } from '@angular/material';

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
    private readonly getCommandInitialGQL: GetCommandInitialGQL,
    private readonly commandsGQL: CommandsGQL,
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
          concatMap(([_, cols]) => this.commandsGQL.fetch({ id, cols })),
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
    return this.listAllCommandsGQL
      .watch({}, { pollInterval: COMMANDS_POLLING })
      .valueChanges.pipe(map(r => r.data.commands));
  }

  getCommand(
    id: string,
    cols$: Observable<number>
  ): Observable<CommandResponse> {
    // Start initial `outChunk` with `out` so we can replay terminal output.
    const initial$ = cols$.pipe(
      first(),
      flatMap(cols => this.getCommandInitialGQL.fetch({ id, cols })),
      map(withDetailedStatus),
      map(r => ({
        ...r,
        outChunk: r.out
      })),
      take(1)
    );

    const rest$ = interval(COMMANDS_POLLING).pipe(
      withLatestFrom(cols$),
      flatMap(([_, cols]) => this.getCommandInitialGQL.fetch({ id, cols })),
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
      .subscribe(() => {});
  }

  stopCommandViaCtrlC(id: string) {
    this.stopCommand(id).add(() => {
      this.snackbar.open('Command has been terminated via ctrl-c', undefined, {
        duration: 1500
      });
    });
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

function withDetailedStatus(r: any) {
  const c = r.data.commands[0];
  return c
    ? {
        ...c,
        detailedStatus: c.detailedStatus ? JSON.parse(c.detailedStatus) : null
      }
    : null;
}
