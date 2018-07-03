import { Component, OnInit, ViewChild } from '@angular/core';
import { CommandOutput, CommandRunner } from '@nxui/utils';
import gql from 'graphql-tag';
import { combineLatest, Observable, Subject } from 'rxjs';
import {
  filter,
  first,
  map,
  publishReplay,
  refCount,
  switchMap,
  withLatestFrom
} from 'rxjs/operators';
import { Apollo } from 'apollo-angular';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { TerminalComponent } from '@nxui/ui';
import { Router } from '@angular/router';

interface SchematicCollectionForNgNew {
  name: string;
  description: string;
}

interface NgNewInvocation {
  name: string;
  path: string;
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
          path: new FormControl(null, Validators.required),
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
            mutation($path: String!, $name: String!, $collection: String!) {
              ngNew(path: $path, name: $name, collection: $collection) {
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
          this.router.navigate(['/workspaces', `${ngNew.path}/${ngNew.name}`]);
        }
      }
    );
  }

  createNewWorkspace(ngNewInvocation: NgNewInvocation) {
    this.command$.next(
      `ng new ${ngNewInvocation.name} --collection=${
        ngNewInvocation.collection
      }`
    );
    this.ngNew$.next(ngNewInvocation);
  }

  trackByName(index: number, addon: SchematicCollectionForNgNew) {
    return addon.name;
  }
}
