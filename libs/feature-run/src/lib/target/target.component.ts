import { Component, OnInit, ViewChild } from '@angular/core';
import {
  concatMap,
  debounceTime,
  first,
  map,
  publishReplay,
  refCount,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import gql from 'graphql-tag';
import { BehaviorSubject, combineLatest, Observable, of, Subject } from 'rxjs';
import { CommandOutput, CommandRunner, Project, Serializer } from '@nxui/utils';
import { Apollo } from 'apollo-angular';
import { ActivatedRoute } from '@angular/router';
import { TerminalComponent } from '@nxui/ui';

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
  private ngRun$ = new Subject<any>();

  constructor(
    private apollo: Apollo,
    private route: ActivatedRoute,
    private runner: CommandRunner,
    private serializer: Serializer
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
        const project = r.data.workspace.projects[0];
        const architect = r.data.workspace.projects[0].architect.map(a => ({
          ...a,
          schema: this.serializer.normalizeTarget(a.builder, a.schema)
        }));
        return {
          ...project,
          architect
        };
      }),
      publishReplay(1),
      refCount()
    );

    this.commandOutput$ = this.ngRun$.pipe(
      withLatestFrom(this.commandArray$),
      switchMap(([q, c]) => {
        this.out.clear();
        console.log('run', c.commands);
        return this.runner.runCommand(
          gql`
            mutation($path: String!, $runCommand: [String]!) {
              run(path: $path, runCommand: $runCommand) {
                command
              }
            }
          `,
          {
            path: this.route.snapshot.params['path'],
            runCommand: c.commands
          },
          r => r.data.run.command,
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

  onRun() {
    console.log('onRun');
    this.ngRun$.next();
  }

  onStop() {
    this.runner.stopAllCommands();
  }

  onFlagsChange(e: { commands: string[]; valid: boolean }) {
    setTimeout(() => this.commandArray$.next(e), 0);
  }
}
