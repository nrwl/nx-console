import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import {
  debounceTime,
  map,
  publishReplay,
  refCount,
  switchMap,
  tap,
  withLatestFrom,
  startWith,
  filter
} from 'rxjs/operators';

import { BehaviorSubject, merge, Observable, of, Subject } from 'rxjs';
import {
  CommandOutput,
  CommandRunner,
  Schematic,
  Serializer
} from '@nxui/utils';
import { ActivatedRoute } from '@angular/router';
import { TerminalComponent } from '@nxui/ui';

const MISSING_REQUIRED_FLAGS: CommandOutput = {
  status: 'success',
  out: 'Command is missing required fields'
};

@Component({
  selector: 'nxui-schematic',
  templateUrl: './schematic.component.html',
  styleUrls: ['./schematic.component.css']
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

  combinedOutput$: Observable<CommandOutput>;
  @ViewChild('combinedOutput', { read: TerminalComponent })
  out: TerminalComponent;

  private ngGen$ = new Subject<void>();

  constructor(
    private readonly apollo: Apollo,
    private readonly runner: CommandRunner,
    private readonly route: ActivatedRoute,
    private readonly serializer: Serializer
  ) {}

  ngOnInit() {
    const schematicDescription$ = this.route.params.pipe(
      map(p => {
        if (!p.collection || !p.schematic) return null;
        return {
          collection: decodeURIComponent(p.collection),
          name: decodeURIComponent(p.schematic)
        };
      })
    );

    this.schematic$ = schematicDescription$.pipe(
      switchMap(p => {
        if (!p) {
          return of();
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
          variables: {
            path: this.route.snapshot.params['path'],
            collection: p.collection,
            schematic: p.name
          }
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
      publishReplay(1),
      refCount()
    );

    this.dryRunResult$ = this.commandArray$.pipe(
      debounceTime(300),
      switchMap(c => {
        this.out.clear();
        if (!c.valid) {
          return of(MISSING_REQUIRED_FLAGS);
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
            path: this.route.snapshot.params['path'],
            genCommand: c.commands
          },
          r => r.data.generate.command,
          true
        );
      }),
      publishReplay(1),
      refCount()
    );

    this.commandOutput$ = this.ngGen$.pipe(
      withLatestFrom(this.commandArray$),
      switchMap(([_, c]) => {
        this.out.clear();
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
          r => r.data.generate.command,
          false
        );
      }),
      publishReplay(1),
      refCount()
    );

    this.combinedOutput$ = merge(this.dryRunResult$, this.commandOutput$);

    this.command$ = this.commandArray$.pipe(
      map(c => `ng generate ${this.serializer.argsToString(c.commands)}`)
    );
  }

  onGenerate() {
    this.ngGen$.next();
  }

  onStop() {
    this.runner.stopAllCommands();
  }

  onFlagsChange(e: { commands: string[]; valid: boolean }) {
    setTimeout(() => this.commandArray$.next(e), 0);
  }
}
