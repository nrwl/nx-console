import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  ViewChild
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ContextualActionBarService,
  FlagsComponent,
  TaskRunnerComponent,
  TerminalComponent
} from '@nxui/ui';
import {
  CommandOutput,
  CommandRunner,
  NpmScript,
  Serializer
} from '@nxui/utils';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import {
  map,
  publishReplay,
  refCount,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nxui-npmscript',
  templateUrl: './npmscript.component.html',
  styleUrls: ['./npmscript.component.css']
})
export class NpmScriptComponent implements OnInit {
  script$: Observable<NpmScript>;
  commandArray$ = new BehaviorSubject<{ commands: string[]; valid: boolean }>({
    commands: [],
    valid: true
  });
  command$: Observable<string>;
  commandOutput$: Observable<CommandOutput>;
  @ViewChild(TerminalComponent) out: TerminalComponent;
  @ViewChild(TaskRunnerComponent) taskRunner: TaskRunnerComponent;
  @ViewChild(FlagsComponent) flags: FlagsComponent;
  private readonly ngRun$ = new Subject<any>();
  private readonly ngRunDisabled$ = new BehaviorSubject(true);

  constructor(
    private readonly apollo: Apollo,
    private readonly route: ActivatedRoute,
    private readonly runner: CommandRunner,
    private readonly serializer: Serializer,
    private readonly contextActionService: ContextualActionBarService
  ) {}

  ngOnInit() {
    const targetDescription$ = this.route.params.pipe(
      map(p => {
        if (!p.script) return null;
        return {
          script: decodeURIComponent(p.script),
          path: p.path
        };
      })
    );

    this.script$ = targetDescription$.pipe(
      switchMap(p => {
        if (!p) {
          return of();
        }
        if (this.out) {
          this.out.reset();
        }
        return this.apollo.query({
          query: gql`
            query($path: String!, $script: String!) {
              workspace(path: $path) {
                npmScripts(name: $script) {
                  name
                  npmClient
                  schema {
                    name
                    enum
                    type
                    description
                    defaultValue
                    required
                    positional
                  }
                }
              }
            }
          `,
          variables: p
        });
      }),
      map((r: any) => {
        const script: NpmScript = r.data.workspace.npmScripts[0];
        return {
          ...script,
          schema: this.serializer.normalizeTarget(script.name, script.schema)
        };
      }),
      tap((script: NpmScript) => {
        const contextTitle = this.getContextTitle(script);

        this.contextActionService.contextualActions$.next({
          contextTitle,
          actions: [
            {
              invoke: this.ngRun$,
              disabled: this.ngRunDisabled$,
              name: 'Run'
            }
          ]
        });
      }),
      publishReplay(1),
      refCount()
    );

    this.commandOutput$ = this.ngRun$.pipe(
      withLatestFrom(this.commandArray$, this.script$),
      tap(() => {
        this.flags.hideFields();
        this.taskRunner.terminalVisible.next(true);
      }),
      switchMap(([_, c, s]) => {
        this.out.reset();
        return this.runner.runCommand(
          gql`
            mutation(
              $path: String!
              $npmClient: String!
              $runCommand: [String]!
            ) {
              runNpm(
                path: $path
                npmClient: $npmClient
                runCommand: $runCommand
              ) {
                command
              }
            }
          `,
          {
            path: this.path(),
            npmClient: s.npmClient,
            runCommand: c.commands
          },
          r => r.data.runNpm.command,
          false
        );
      }),
      publishReplay(1),
      refCount()
    );

    this.command$ = this.commandArray$.pipe(
      withLatestFrom(this.script$),
      map(
        ([c, s]) => `${s.npmClient} ${this.serializer.argsToString(c.commands)}`
      )
    );
  }

  getContextTitle(script: NpmScript) {
    return `${script.npmClient} run ${script.name}`;
  }

  path() {
    return this.route.snapshot.params.path;
  }

  onRun() {
    this.ngRun$.next();
  }

  onStop() {
    this.runner.stopAllCommands();
  }

  onFlagsChange(e: { commands: string[]; valid: boolean }) {
    setTimeout(() => this.commandArray$.next(e), 0);
    this.ngRunDisabled$.next(!e.valid);
  }
}
