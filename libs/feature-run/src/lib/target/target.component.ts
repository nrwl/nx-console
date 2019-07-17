import { Architect, Project } from '@angular-console/schema';
import {
  CommandOutputComponent,
  FlagsComponent,
  TaskRunnerComponent
} from '@angular-console/ui';
import {
  CommandRunner,
  IncrementalCommandOutput,
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
  @ViewChild(CommandOutputComponent, { static: false })
  out: CommandOutputComponent;
  @ViewChild(TaskRunnerComponent, { static: false })
  taskRunner: TaskRunnerComponent;
  @ViewChild(FlagsComponent, { static: false }) flags: FlagsComponent;

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
          false,
          this.out.terminal.currentCols
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
    const prefix = this.getPrefix(project.architect[0].name, project.name);
    return `ng ${prefix.join(' ')}`;
  }

  getPrefix(targetName: string, projectName: string) {
    if (this.runSyntax(targetName)) {
      return ['run', `${projectName}:${targetName}`];
    } else {
      return [targetName, projectName];
    }
  }

  runSyntax(targetName: string) {
    return !(
      targetName === 'build' ||
      targetName === 'serve' ||
      targetName === 'e2e' ||
      targetName === 'test' ||
      targetName === 'lint'
    );
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

  initSourceMapAndStatsJson(architect: Architect) {
    if (architect.name !== 'build') {
      return;
    }

    const defaultValues = architect.configurations[0]
      ? architect.configurations[0].defaultValues
      : [];
    const sourceMap = defaultValues.find(value => value.name === 'sourceMap');
    const statsJson = defaultValues.find(value => value.name === 'statsJson');

    return {
      sourceMap: sourceMap ? sourceMap.defaultValue : true,
      statsJson: statsJson ? statsJson.defaultValue : true
    };
  }
}
