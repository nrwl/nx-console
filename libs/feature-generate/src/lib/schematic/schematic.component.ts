import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import {
  debounceTime,
  filter,
  map,
  publishReplay,
  refCount,
  switchMap,
  withLatestFrom,
  startWith,
  defaultIfEmpty,
  tap
} from 'rxjs/operators';

import { BehaviorSubject, Observable, Subject, of, merge } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import {
  CommandOutput,
  CommandRunner,
  Schematic,
  Serializer
} from '@nxui/utils';
import { TerminalComponent } from '@nxui/ui';

@Component({
  selector: 'nxui-schematic',
  templateUrl: './schematic.component.html',
  styleUrls: ['./schematic.component.css']
})
export class SchematicComponent implements OnInit {
  @Input() schematicDescription$: Observable<SchematicDescription | null>;

  schematic$: Observable<Schematic | null>;
  commandArray$ = new BehaviorSubject<{ commands: string[]; valid: boolean }>({
    commands: [],
    valid: false
  });
  command$: Observable<string>;
  dryRunResult$: Observable<CommandOutput | null>;
  commandOutput$: Observable<CommandOutput | null>;

  combinedOutput$: Observable<CommandOutput | null>;

  private ngGen$ = new Subject<void>();

  constructor(
    private readonly apollo: Apollo,
    private readonly runner: CommandRunner,
    private readonly route: ActivatedRoute,
    private readonly serializer: Serializer
  ) {}

  ngOnInit() {
    this.schematic$ = this.schematicDescription$.pipe(
      switchMap(p => {
        if (!p) {
          return of(null);
        }
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
            path: this.route.snapshot.params['path'],
            collection: decodeURIComponent(p.collection),
            schematic: decodeURIComponent(p.name)
          }
        });
      }),
      map((r: any) => {
        if (!r) {
          return null;
        }
        const schematic = r.data.workspace.schematics[0];
        return this.serializer.normalizeSchematic(schematic);
      }),
      publishReplay(1),
      refCount()
    );

    this.command$ = this.commandArray$.pipe(map(r => r.commands.join(' ')));

    this.dryRunResult$ = this.commandArray$.pipe(
      debounceTime(300),
      filter(c => c.valid),
      withLatestFrom(this.schematicDescription$),
      switchMap(([c, schematicDescription]) => {
        if (!schematicDescription) {
          return of(null);
        }

        return this.runner
          .runCommand(
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
          )
          .pipe(startWith(null));
      }),
      publishReplay(1),
      refCount()
    );

    this.commandOutput$ = this.ngGen$.pipe(
      withLatestFrom(this.commandArray$, this.schematicDescription$),
      switchMap(([_, c, schematicDescription]) => {
        if (!schematicDescription) {
          return of(null);
        }
        return this.runner
          .runCommand(
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
          )
          .pipe(startWith(null));
      }),
      publishReplay(1),
      refCount()
    );

    this.combinedOutput$ = merge(this.dryRunResult$, this.commandOutput$).pipe(
      withLatestFrom(this.command$),
      map(([output, command]) => {
        let out = `> ng generate ${command} --dry-run`;
        let status = '';
        if (output) {
          out = `${out}\n\n${output.out}`;
          status = output.status;
        }

        return {
          out,
          status
        };
      })
    );
  }

  onGenerate() {
    this.ngGen$.next();
  }

  onStop() {
    this.runner.stopAllCommands();
  }

  onFlagsChange(e: { commands: string[]; valid: boolean }) {
    this.commandArray$.next(e);
  }
}
