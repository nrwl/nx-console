import { Project } from '@angular-console/schema';
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
import { ProjectsGQL, RunNgGQL } from '../generated/graphql';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-target',
  templateUrl: './target.component.html',
  styleUrls: ['./target.component.css']
})
export class TargetComponent implements OnInit {
  project$: Observable<Project>;
  commandArray$ = new BehaviorSubject<{ commands: string[]; valid: boolean }>({
    commands: [],
    valid: true
  });
  command$: Observable<string>;
  commandOutput$: Observable<IncrementalCommandOutput>;
  detailedStatusState$: Observable<null | { type: string; status: any }>;
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
    private readonly projectsGQL: ProjectsGQL,
    private readonly runNgGQL: RunNgGQL
  ) {}

  ngOnInit() {
    const targetDescription$ = this.route.params.pipe(
      map(p => {
        if (!p.target || !p.project) return null;
        return {
          target: decodeURIComponent(p.target),
          project: decodeURIComponent(p.project),
          path: p.path
        };
      })
    );

    this.project$ = targetDescription$.pipe(
      switchMap(p => {
        if (!p) {
          return of();
        }
        if (this.out) {
          this.out.reset();
        }

        return this.projectsGQL.fetch(p);
      }),
      map((r: any) => {
        const project: Project = r.data.workspace.projects[0];
        const architect = project.architect.map(a => ({
          ...a,
          schema: this.serializer.normalizeTarget(a.builder, a.schema)
        }));
        return {
          ...project,
          architect
        };
      }),
      tap((project: Project) => {
        const contextTitle = this.getContextTitle(project);

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
      withLatestFrom(this.commandArray$),
      tap(() => {
        this.flags.hideFields();
        this.taskRunner.terminalVisible$.next(true);
      }),
      switchMap(([_, c]) => {
        this.out.reset();
        return this.runner.runCommand(
          this.runNgGQL.mutate({
            path: this.path(),
            runCommand: c.commands
          }),
          false
        );
      }),
      publishReplay(1),
      refCount()
    );

    this.command$ = this.commandArray$.pipe(
      map(c => `ng ${this.serializer.argsToString(c.commands)}`)
    );
  }

  getContextTitle(project: Project) {
    return `ng ${project.architect[0].name} ${project.name}`;
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
