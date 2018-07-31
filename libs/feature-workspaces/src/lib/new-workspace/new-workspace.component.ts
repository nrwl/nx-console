import {
  ContextualActionBarService,
  DynamicFlatNode,
  TerminalComponent
} from '@angular-console/ui';
import { CommandRunner } from '@angular-console/utils';
import {
  Component,
  Inject,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  ViewEncapsulation
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
  MatExpansionPanel
} from '@angular/material';
import { Router } from '@angular/router';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import {
  filter,
  map,
  publishReplay,
  refCount,
  switchMap,
  tap
} from 'rxjs/operators';

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
  encapsulation: ViewEncapsulation.None,
  selector: 'angular-console-new-workspace',
  templateUrl: './new-workspace.component.html',
  styleUrls: ['./new-workspace.component.scss']
})
export class NewWorkspaceComponent implements OnInit {
  @ViewChildren(MatExpansionPanel)
  matExpansionPanels: QueryList<MatExpansionPanel>;
  schematicCollectionsForNgNew$: Observable<any>;
  ngNewForm$ = new BehaviorSubject<FormGroup | null>(null);

  selectedNode: DynamicFlatNode | null = null;

  private createNewWorkspace$ = new Subject<void>();

  constructor(
    private readonly apollo: Apollo,
    private readonly contextActionService: ContextualActionBarService,
    private readonly matDialog: MatDialog
  ) {}

  private static newFormGroup(): FormGroup {
    return new FormGroup({
      name: new FormControl(null, Validators.required),
      path: new FormControl(null, Validators.required),
      collection: new FormControl(null, Validators.required)
    });
  }

  ngOnInit() {
    this.contextActionService.contextualActions$.subscribe(actions => {
      if (!actions) {
        this.matExpansionPanels.forEach((panel: MatExpansionPanel) => {
          panel.close();
        });
        this.selectedNode = null;
        this.ngNewForm$.next(NewWorkspaceComponent.newFormGroup());
      }
    });

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

    this.schematicCollectionsForNgNew$.subscribe(() => {
      this.ngNewForm$.next(NewWorkspaceComponent.newFormGroup());
    });

    this.createNewWorkspace$.subscribe(() => {
      const form = this.ngNewForm$.value;
      if (form) {
        this.createNewWorkspace(form.value as NgNewInvocation);
      }
    });

    this.ngNewForm$
      .pipe(
        filter(form => Boolean(form)),
        switchMap((form: FormGroup) => form.valueChanges)
      )
      .subscribe((formValue: any) => {
        if (formValue.path) {
          this.contextActionService.contextualActions$.next({
            contextTitle: 'Fill In Required Details',
            actions: [
              {
                name: 'Create',
                disabled: new BehaviorSubject(this.ngNewForm$.value!.invalid),
                invoke: this.createNewWorkspace$
              }
            ]
          });
        } else {
          this.contextActionService.contextualActions$.next(null);
        }
      });
  }

  createNewWorkspace(ngNewInvocation: NgNewInvocation) {
    this.matDialog
      .open(CreateNewWorkspaceDialog, {
        width: 'calc(100vw - 128px)',
        height: 'calc(100vh - 128px)',
        panelClass: 'create-new-workspace-dialog',
        data: { ngNewInvocation }
      })
      .beforeClose()
      .subscribe(() => {
        this.contextActionService.contextualActions$.next(null);
      });
  }

  trackByName(_: number, collection: SchematicCollectionForNgNew) {
    return collection.name;
  }

  setPathField(node: DynamicFlatNode) {
    const form = this.ngNewForm$.value;
    if (!form) {
      return;
    }

    const field = form.get('path');
    if (!field) {
      return;
    }

    if (this.selectedNode === node) {
      this.selectedNode = null;
      const field = form.get('path');
      if (field) {
        field.setValue(null);
      }
    } else {
      this.selectedNode = node;
      field.setValue(node.path);
    }
  }
}

@Component({
  selector: 'create-new-workspace-dialog',
  template: `
    <ui-terminal [command]="command" [input]="(commandOutput$|async)?.out"></ui-terminal>
  `
})
export class CreateNewWorkspaceDialog {
  command = `ng new ${this.data.ngNewInvocation.name} --collection=${
    this.data.ngNewInvocation.collection
  }`;

  commandOutput$ = this.commandRunner
    .runCommand(
      gql`
        mutation($path: String!, $name: String!, $collection: String!) {
          ngNew(path: $path, name: $name, collection: $collection) {
            command
          }
        }
      `,
      this.data.ngNewInvocation,
      false
    )
    .pipe(
      tap(command => {
        if (command.status === 'success') {
          this.dialogRef.close();
          this.router.navigate([
            '/workspace',
            `${this.data.ngNewInvocation.path}/${
              this.data.ngNewInvocation.name
            }`,
            'details'
          ]);
        }
      })
    );

  constructor(
    private readonly dialogRef: MatDialogRef<CreateNewWorkspaceDialog>,
    private readonly commandRunner: CommandRunner,
    private readonly router: Router,
    @Inject(MAT_DIALOG_DATA)
    readonly data: {
      ngNewInvocation: NgNewInvocation;
    }
  ) {}
}
