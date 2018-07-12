import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ContextualActionBarService,
  FlagsComponent,
  TaskRunnerComponent,
  TerminalComponent
} from '@nxui/ui';
import { CommandOutput, CommandRunner, Project, Serializer } from '@nxui/utils';
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
  selector: 'nxui-target',
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
  commandOutput$: Observable<CommandOutput>;
  @ViewChild('output', { read: TerminalComponent })
  out: TerminalComponent;
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
          this.out.clear();
        }
        return this.apollo.query({
          query: gql`
            query($path: String!, $project: String!, $target: String!) {
              workspace(path: $path) {
                projects(name: $project) {
                  name
                  root
                  projectType
                  architect(name: $target) {
                    name
                    description
                    builder
                    configurations {
                      name
                    }
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
        this.taskRunner.terminalVisible.next(true);
      }),
      switchMap(([_, c]) => {
        this.out.clear();
        return this.runner.runCommand(
          gql`
            mutation($path: String!, $runCommand: [String]!) {
              runNg(path: $path, runCommand: $runCommand) {
                command
              }
            }
          `,
          {
            path: this.path(),
            runCommand: c.commands
          },
          r => r.data.runNg.command,
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

  onStop() {
    this.runner.stopAllCommands();
  }

  onFlagsChange(e: { commands: string[]; valid: boolean }) {
    setTimeout(() => this.commandArray$.next(e), 0);
    this.ngRunDisabled$.next(!e.valid);
  }
}
