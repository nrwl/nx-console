import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TerminalComponent } from '@nxui/ui';
import { CommandOutput, CommandRunner } from '@nxui/utils';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { combineLatest, Observable, Subject } from 'rxjs';
import { map, publishReplay, refCount, switchMap } from 'rxjs/operators';

interface SchematicCollectionForNgNew {
  name: string;
  description: string;
}

interface NgNewInvocation {
  name: string;
  directory: string;
  collection: string;
}

@Component({
  selector: 'nxui-new-workspace',
  templateUrl: './new-workspace.component.html',
  styleUrls: ['./new-workspace.component.css']
})
export class NewWorkspaceComponent implements OnInit {
  schematicCollectionsForNgNew$: Observable<any>;
  ngNewForm$: Observable<FormGroup>;

  commandOutput$: Observable<CommandOutput>;
  command$ = new Subject();
  private ngNew$ = new Subject<NgNewInvocation>();
  @ViewChild('out', { read: TerminalComponent })
  out: TerminalComponent;

  constructor(
    private readonly apollo: Apollo,
    private readonly commandRunner: CommandRunner,
    private readonly router: Router
  ) {}

  ngOnInit() {
    this.schematicCollectionsForNgNew$ = this.apollo
      .watchQuery({
        pollInterval: 2000,
        query: gql`
          {
            schematicCollections {
              name
              description
            }
          }
        `
      })
      .valueChanges.pipe(
        map((r: any) => r.data.schematicCollections),
        publishReplay(1),
        refCount()
      );

    this.ngNewForm$ = this.schematicCollectionsForNgNew$.pipe(
      map(r => {
        return new FormGroup({
          name: new FormControl(null, Validators.required),
          directory: new FormControl(null, Validators.required),
          collection: new FormControl(r[0].name, Validators.required)
        });
      }),
      publishReplay(1),
      refCount()
    );

    this.commandOutput$ = this.ngNew$.pipe(
      switchMap(ngNewInvocation => {
        this.out.clear();
        return this.commandRunner.runCommand(
          gql`
            mutation(
              $directory: String!
              $name: String!
              $collection: String!
            ) {
              ngNew(
                directory: $directory
                name: $name
                collection: $collection
              ) {
                command
              }
            }
          `,
          ngNewInvocation,
          (res: any) => res.data.ngNew.command,
          false
        );
      }),
      publishReplay(1),
      refCount()
    );

    combineLatest(this.ngNew$, this.commandOutput$).subscribe(
      ([ngNew, command]) => {
        if (command.status === 'success') {
          this.router.navigate(['/workspaces', ngNew.directory, 'details']);
        }
      }
    );
  }

  createNewWorkspace(ngNewInvocation: NgNewInvocation) {
    this.command$.next(
      `ng new ${ngNewInvocation.name} --directory=${
        ngNewInvocation.directory
      } --collection=${ngNewInvocation.collection}`
    );
    this.ngNew$.next(ngNewInvocation);
  }

  trackByName(_: number, addon: SchematicCollectionForNgNew) {
    return addon.name;
  }
}
