import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  ViewChild
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TerminalComponent, DynamicFlatNode } from '@nxui/ui';
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
  path: string;
  collection: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nxui-new-workspace',
  templateUrl: './new-workspace.component.html',
  styleUrls: ['./new-workspace.component.scss']
})
export class NewWorkspaceComponent implements OnInit {
  schematicCollectionsForNgNew$: Observable<any>;
  ngNewForm$: Observable<FormGroup>;

  commandOutput$: Observable<CommandOutput>;
  command$ = new Subject();
  private readonly ngNew$ = new Subject<NgNewInvocation>();
  @ViewChild(TerminalComponent) out: TerminalComponent;
  selectedNode: DynamicFlatNode | null = null;

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
        this.out.reset();
        return this.commandRunner.runCommand(
          gql`
            mutation($path: String!, $name: String!, $collection: String!) {
              ngNew(path: $path, name: $name, collection: $collection) {
                command
              }
            }
          `,
          ngNewInvocation,
          false
        );
      }),
      publishReplay(1),
      refCount()
    );

    combineLatest(this.ngNew$, this.commandOutput$).subscribe(
      ([ngNew, command]) => {
        if (command.status === 'success') {
          this.router.navigate([
            '/workspace',
            `${ngNew.path}/${ngNew.name}`,
            'details'
          ]);
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

  trackByName(_: number, collection: SchematicCollectionForNgNew) {
    return collection.name;
  }

  setPathField(node: DynamicFlatNode) {
    if (this.selectedNode === node) {
      this.selectedNode = null;
      this.ngNewForm$.subscribe(form => {
        const field = form.get('path');
        if (field) {
          field.setValue(null);
        }
      });
      return;
    }
    this.selectedNode = node;
    this.ngNewForm$.subscribe(form => {
      const field = form.get('path');
      if (field) {
        field.setValue(node.path);
      }
    });
  }
}
