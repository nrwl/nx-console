import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ContextualActionBarService,
  FlagsComponent,
  TaskRunnerComponent,
  TerminalComponent
} from '@angular-console/ui';
import {
  CommandOutput,
  CommandRunner,
  Schematic,
  Serializer
} from '@angular-console/utils';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { BehaviorSubject, merge, Observable, of, Subject } from 'rxjs';
import {
  debounceTime,
  map,
  publishReplay,
  refCount,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';

const MISSING_REQUIRED_FLAGS: CommandOutput = {
  status: 'success',
  out: 'Command is missing required fields'
};

const DEBOUNCE_TIME = 300;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-schematic',
  templateUrl: './schematic.component.html',
  styleUrls: ['./schematic.component.scss']
})
export class SchematicComponent implements OnInit {
  schematic$: Observable<Schematic | null>;
  commandArray$ = new BehaviorSubject<{ commands: string[]; valid: boolean }>({
    commands: [],
    valid: false
  });
  command$: Observable<string>;
  dryRunResult$: Observable<CommandOutput>;
  commandOutput$: Observable<CommandOutput>;
  initValues$: Observable<any>;

  combinedOutput$: Observable<CommandOutput>;
  @ViewChild(TerminalComponent) out: TerminalComponent;
  @ViewChild(TaskRunnerComponent) taskRunner: TaskRunnerComponent;
  @ViewChild(FlagsComponent) flags: FlagsComponent;

  private readonly ngGen$ = new Subject<void>();
  private readonly ngGenDisabled$ = new BehaviorSubject(true);

  constructor(
    private readonly apollo: Apollo,
    private readonly runner: CommandRunner,
    private readonly route: ActivatedRoute,
    private readonly serializer: Serializer,
    private readonly elementRef: ElementRef,
    private readonly contextActionService: ContextualActionBarService
  ) {}

  ngOnInit() {
    const schematicDescription$ = this.route.params.pipe(
      map(p => {
        if (!p.collection || !p.schematic) return null;
        return {
          collection: decodeURIComponent(p.collection),
          schematic: decodeURIComponent(p.schematic),
          path: p.path
        };
      })
    );

    this.initValues$ = this.route.params.pipe(
      map(p => {
        return {
          project: p.project
        };
      })
    );

    this.schematic$ = schematicDescription$.pipe(
      switchMap(p => {
        if (!p) {
          return of();
        }
        if (this.out) {
          this.out.reset();
        }
        return this.apollo.query({
          query: gql`
            query($path: String!, $collection: String!, $schematic: String!) {
              workspace(path: $path) {
                schematicCollections(name: $collection) {
                  schematics(name: $schematic) {
                    collection
                    name
                    description
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
            }
          `,
          variables: p
        });
      }),
      map((r: any) => {
        if (!r) {
          return null;
        }
        const schematic: Schematic =
          r.data.workspace.schematicCollections[0].schematics[0];

        return this.serializer.normalizeSchematic(schematic);
      }),
      tap((schematic: Schematic) => {
        const uiFlags = (this.elementRef
          .nativeElement as HTMLElement).querySelector('.ui-flags-container');

        this.contextActionService.contextualActions$.next({
          contextTitle: this.getContextTitle(schematic),
          actions: [
            {
              invoke: this.ngGen$,
              disabled: this.ngGenDisabled$,
              name: 'Generate'
            }
          ]
        });

        if (uiFlags && uiFlags.scrollTo) {
          uiFlags.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
      }),
      publishReplay(1),
      refCount()
    );

    this.dryRunResult$ = this.commandArray$.pipe(
      debounceTime(DEBOUNCE_TIME),
      switchMap(c => {
        this.out.reset();
        if (!c.valid) {
          return of(MISSING_REQUIRED_FLAGS);
        }
        if (this.runner.activeCommand$.value) {
          return of();
        }
        return this.runner.runCommand(
          gql`
            mutation($path: String!, $genCommand: [String]!) {
              generate(path: $path, genCommand: $genCommand, dryRun: true) {
                command
              }
            }
          `,
          {
            path: this.path(),
            genCommand: c.commands
          },
          true
        );
      }),
      publishReplay(1),
      refCount()
    );

    this.commandOutput$ = this.ngGen$.pipe(
      withLatestFrom(this.commandArray$),
      tap(() => {
        this.flags.hideFields();
        this.taskRunner.terminalVisible.next(true);
      }),
      switchMap(([_, c]) => {
        this.out.reset();
        return this.runner.runCommand(
          gql`
            mutation($path: String!, $genCommand: [String]!) {
              generate(path: $path, genCommand: $genCommand, dryRun: false) {
                command
              }
            }
          `,
          {
            path: this.route.snapshot.params.path,
            genCommand: c.commands
          },
          false
        );
      }),
      publishReplay(1),
      refCount()
    );

    this.combinedOutput$ = merge(this.dryRunResult$, this.commandOutput$);

    this.command$ = merge(
      this.dryRunResult$.pipe(
        withLatestFrom(this.commandArray$),
        map(([_, commandArray]) => [...commandArray.commands, '--dry-run'])
      ),
      this.commandOutput$.pipe(
        withLatestFrom(this.commandArray$),
        map(([_, commandArray]) => commandArray.commands)
      )
    ).pipe(
      map(commands => `ng generate ${this.serializer.argsToString(commands)}`)
    );
  }

  getContextTitle(schematic: Schematic) {
    let contextTitle =
      schematic.description || `${schematic.collection} - ${schematic.name}`;

    if (contextTitle.endsWith('.')) {
      contextTitle = contextTitle.slice(0, contextTitle.length - 1);
    }

    return contextTitle;
  }

  path() {
    return this.route.snapshot.params.path;
  }

  onFlagsChange(e: { commands: string[]; valid: boolean }) {
    this.commandArray$.next(e);
    this.ngGenDisabled$.next(!e.valid);
  }
}
