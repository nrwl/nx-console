import { NpmScript } from '@angular-console/schema';
import {
  FlagsComponent,
  TaskRunnerComponent,
  CommandOutputComponent
} from '@angular-console/ui';
import {
  IncrementalCommandOutput,
  CommandRunner,
  Serializer
} from '@angular-console/utils';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import {
  map,
  publishReplay,
  refCount,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { NpmRunGQL, NpmScriptsGQL } from '../generated/graphql';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-npmscript',
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
  commandOutput$: Observable<IncrementalCommandOutput>;
  @ViewChild(CommandOutputComponent) out: CommandOutputComponent;
  @ViewChild(TaskRunnerComponent) taskRunner: TaskRunnerComponent;
  @ViewChild(FlagsComponent) flags: FlagsComponent;
  private readonly ngRun$ = new Subject<any>();
  private readonly ngRunDisabled$ = new BehaviorSubject(true);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly runner: CommandRunner,
    private readonly serializer: Serializer,
    private readonly contextActionService: ContextualActionBarService,
    private readonly npmRunGQL: NpmRunGQL,
    private readonly npmScriptsGQL: NpmScriptsGQL
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

        return this.npmScriptsGQL.fetch(p);
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
        this.taskRunner.terminalVisible$.next(true);
      }),
      switchMap(([_, c, s]) => {
        this.out.reset();
        return this.runner.runCommand(
          this.npmRunGQL.mutate({
            path: this.path(),
            npmClient: s.npmClient || '',
            runCommand: c.commands
          }),
          false,
          this.out.terminal.currentCols
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

  onFlagsChange(e: { commands: string[]; valid: boolean }) {
    setTimeout(() => this.commandArray$.next(e), 0);
    this.ngRunDisabled$.next(!e.valid);
  }
}
