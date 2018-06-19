import { Component, OnInit, ViewChild } from '@angular/core';
import { concatMap, map, publishReplay, refCount, switchMap, withLatestFrom } from 'rxjs/operators';
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
  commandArray$ = new BehaviorSubject<{ commands: string[], valid: boolean }>({ commands: [], valid: false });
  command$: Observable<string>;
  commandOutput$: Observable<CommandOutput>;
  @ViewChild('out', { read: TerminalComponent }) out: TerminalComponent;
  private ngRun$ = new Subject<any>();

  constructor(private apollo: Apollo, private route: ActivatedRoute, private runner: CommandRunner, private serializer: Serializer) {
  }

  ngOnInit() {
    this.project$ = this.route.params.pipe(
      switchMap((p) => {
        return this.apollo.query({
          query: gql`
            query($path: String!, $projectName: String!, $targetName: String!) {
              workspace(path: $path) {
                projects(name: $projectName) {
                  name
                  root
                  projectType
                  architect(name: $targetName) {
                    name
                    description
                    builder
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
          variables: {
            path: p['path'],
            projectName: p['projectName'],
            targetName: p['targetName']
          }
        });
      }),
      map((r: any) => {
        const project = r.data.workspace.projects[0];
        const architect = r.data.workspace.projects[0].architect.map(a => ({
          ...a,
          schema: this.serializer.normalize(a.schema)
        }));
        return {
          ...project,
          architect
        };
      }),
      publishReplay(1),
      refCount()
    );

    this.command$ = this.commandArray$.pipe(map(r => r.commands.join(' ')));

    this.commandOutput$ = this.ngRun$.pipe(
      withLatestFrom(this.commandArray$),
      switchMap(([q, c]) => {
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
          (r) => r.data.run.command,
          false
        );
      }),
      publishReplay(1),
      refCount()
    );
  }

  onRun() {
    this.out.clear();
    this.ngRun$.next();
  }

  onStop() {
    this.runner.stopAllCommands();
  }

  onFlagsChange(e: { commands: string[], valid: boolean }) {
    this.commandArray$.next(e);
  }
}
