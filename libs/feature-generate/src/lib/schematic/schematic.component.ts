import { Component, OnInit, ViewChild } from '@angular/core';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { debounceTime, filter, map, publishReplay, refCount, switchMap, withLatestFrom } from 'rxjs/operators';

import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { CommandOutput, CommandRunner, Schematic, Serializer } from '@nxui/utils';
import { TerminalComponent } from '@nxui/ui';

@Component({
  selector: 'nxui-schematic',
  templateUrl: './schematic.component.html',
  styleUrls: ['./schematic.component.css']
})
export class SchematicComponent implements OnInit {
  schematic$: Observable<Schematic>;
  commandArray$ = new BehaviorSubject<{commands: string[], valid: boolean}>({commands: [], valid: false});
  command$: Observable<string>;
  dryRunResult$: Observable<CommandOutput>;
  commandOutput$: Observable<CommandOutput>;
  @ViewChild('out', { read: TerminalComponent }) out: TerminalComponent;
  @ViewChild('dryRun', { read: TerminalComponent }) dryRun: TerminalComponent;

  private ngGen$ = new Subject<void>();

  constructor(private apollo: Apollo, private route: ActivatedRoute, private runner: CommandRunner, private serializer: Serializer) {
  }

  ngOnInit() {
    this.schematic$ = this.route.params.pipe(
      switchMap((p) => {
        return this.apollo.query({
          query: gql`
            query($path: String!, $collection: String!, $schematic: String!) {
              workspace(path: $path) {
                schematics(collection: $collection, schematic: $schematic) {
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
          `,
          variables: {
            path: p['path'],
            collection: decodeURIComponent(p['collection']),
            schematic: decodeURIComponent(p['schematic'])
          }
        });
      }),
      map((r: any) => {
        const schematic = r.data.workspace.schematics[0];
        return {
          ...schematic,
          schema: this.serializer.normalize(schematic.schema)
        }
      }),
      publishReplay(1),
      refCount()
    );

    this.command$ = this.commandArray$.pipe(
      map(r => r.commands.join(' '))
    );

    this.dryRunResult$ = this.commandArray$.pipe(
      debounceTime(300),
      filter(c => c.valid),
      switchMap(c => {
        this.dryRun.clear();
        return this.runner.runCommand(
          gql`
              mutation($path: String!, $genCommand: [String]!) {
                generate(path: $path, genCommand: $genCommand, dryRun: true) {
                  command
                }
              }
            `,
          {
            path: this.route.snapshot.params['path'],
            genCommand: c.commands
          },
          (r) => r.data.generate.command,
          true
        );
      }),
      publishReplay(1),
      refCount()
    );

    this.commandOutput$ = this.ngGen$.pipe(
      withLatestFrom(this.commandArray$),
      switchMap(([_, c]) => {
        return this.runner.runCommand(
          gql`
            mutation($path: String!, $genCommand: [String]!) {
              generate(path: $path, genCommand: $genCommand, dryRun: false) {
                command
              }
            }
           `,
          {
            path: this.route.snapshot.params['path'],
            genCommand: c.commands
          },
          (r) => r.data.generate.command,
          false
        );
      }),
      publishReplay(1),
      refCount()
    );
  }

  onGenerate() {
    this.out.clear();
    this.ngGen$.next();
  }

  onStop() {
    this.runner.stopAllCommands();
  }

  onFlagsChange(e: {commands: string[], valid: boolean}) {
    this.commandArray$.next(e);
  }
}
