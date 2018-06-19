import { Component, OnInit } from '@angular/core';
import { map, publishReplay, refCount, switchMap, withLatestFrom } from 'rxjs/operators';
import gql from 'graphql-tag';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { CommandOutput, CommandRunner, Project, Serializer } from '@nxui/utils';
import { Apollo } from 'apollo-angular';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Field } from '@nxui/utils/src/lib/serializer.service';

@Component({
  selector: 'nxui-target',
  templateUrl: './target.component.html',
  styleUrls: ['./target.component.css']
})
export class TargetComponent implements OnInit {
  project$: Observable<Project>;
  commandArray$ = new BehaviorSubject<{commands: string[], valid: boolean}>({commands: [], valid: false});
  command$: Observable<string>;
  commandOutput$: Observable<CommandOutput>;
  private ngRun$ = new Subject<void>();

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
        const architect = r.data.workspace.projects[0].architect.map(a => ({...a, schema: this.serializer.normalize(a.schema)}));
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
      switchMap(([_, c]) => {
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
      })
    );
  }

  run() {
    this.ngRun$.next(null);
    return false;
  }

  onFlagsChange(e: {commands: string[], valid: boolean}) {
    this.commandArray$.next(e);
  }
}
