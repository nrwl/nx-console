import { Schematic } from '@angular-console/schema';
import {
  FlagsComponent,
  TaskRunnerComponent,
  CommandOutputComponent
} from '@angular-console/ui';
import {
  IncrementalCommandOutput,
  CommandRunner,
  Serializer,
  CommandStatus
} from '@angular-console/utils';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { BehaviorSubject, merge, Observable, of, Subject } from 'rxjs';
import {
  debounceTime,
  map,
  publishReplay,
  refCount,
  startWith,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import {
  GenerateGQL,
  SchematicCollectionsByNameGQL
} from '../generated/graphql';

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
  dryRunResult$: Observable<IncrementalCommandOutput>;
  commandOutput$: Observable<IncrementalCommandOutput>;
  initValues$: Observable<any>;

  combinedOutput$: Observable<IncrementalCommandOutput>;
  @ViewChild(CommandOutputComponent) out: CommandOutputComponent;
  @ViewChild(TaskRunnerComponent) taskRunner: TaskRunnerComponent;
  @ViewChild(FlagsComponent) flags: FlagsComponent;

  private readonly ngGen$ = new Subject<void>();
  readonly ngGenDisabled$ = new BehaviorSubject(true);

  constructor(
    private readonly runner: CommandRunner,
    private readonly route: ActivatedRoute,
    private readonly serializer: Serializer,
    private readonly elementRef: ElementRef,
    private readonly contextActionService: ContextualActionBarService,
    private readonly generateGQL: GenerateGQL,
    private readonly schematicCollectionsByNameGQL: SchematicCollectionsByNameGQL
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

        return this.schematicCollectionsByNameGQL.fetch(p);
      }),
      map((r: any) => {
        if (!r) {
          return null;
        }
        const schematic: Schematic =
          r.data.workspace.schematicCollections[0].schematics[0];

        return this.serializer.normalizeSchematic(schematic);
      }),
      tap((schematic: Schematic|null) => {
        if (! schematic) return;
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
        if (this.runner.activeCommand$.value) {
          return of();
        }

        this.out.reset();
        if (!c.valid) {
          // cannot use change detection because the operation isn't idempotent
          this.out.commandResponse = {
            id: '',
            command: '',
            out: '',
            detailedStatus: null,
            status: CommandStatus.TERMINATED,
            outChunk: 'Command is missing required fields'
          };
          return of();
        }

        return this.runner.runCommand(
          this.generateGQL.mutate({
            path: this.path(),
            genCommand: c.commands,
            dryRun: true
          }),
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
        this.taskRunner.terminalVisible$.next(true);
      }),
      switchMap(([_, c]) => {
        this.out.reset();
        return this.runner.runCommand(
          this.generateGQL.mutate({
            path: this.route.snapshot.params.path,
            genCommand: c.commands,
            dryRun: false
          }),
          false
        );
      }),
      publishReplay(1),
      refCount()
    );

    this.combinedOutput$ = merge(this.dryRunResult$, this.commandOutput$);

    const isDryRun = merge(
      this.dryRunResult$.pipe(map(() => ['--dry-run'])),
      this.commandOutput$.pipe(map(() => []))
    ).pipe(
      startWith(['--dry-run']),
      publishReplay(1),
      refCount()
    );

    this.command$ = merge(
      this.commandArray$,
      this.commandOutput$,
      this.dryRunResult$
    ).pipe(
      switchMap(() => {
        return this.commandArray$.pipe(
          map(r => r.commands),
          withLatestFrom(isDryRun),
          map(
            c =>
              `ng generate ${this.serializer.argsToString([...c[0], ...c[1]])}`
          )
        );
      })
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

  getPrefix(schematic: Schematic) {
    return [`${schematic.collection}:${schematic.name}`];
  }

  path() {
    return this.route.snapshot.params.path;
  }

  onFlagsChange(e: { commands: string[]; valid: boolean }) {
    this.commandArray$.next(e);
    this.ngGenDisabled$.next(!e.valid);
  }
}
