import { Directory } from '@angular-console/schema';
import { DynamicFlatNode } from '@angular-console/ui';
import { Finder } from '@angular-console/utils';
import {
  Component,
  OnInit,
  QueryList,
  ViewChildren,
  ViewEncapsulation
} from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatDialog, MatExpansionPanel } from '@angular/material';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import {
  BehaviorSubject,
  Observable,
  of,
  OperatorFunction,
  Subject
} from 'rxjs';
import {
  filter,
  map,
  publishReplay,
  refCount,
  switchMap
} from 'rxjs/operators';

import {
  NewWorkspaceDialogComponent,
  NgNewInvocation
} from './new-workspace-dialog.component';

interface SchematicCollectionForNgNew {
  name: string;
  description: string;
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

  private readonly createNewWorkspace$ = new Subject<void>();

  constructor(
    private readonly apollo: Apollo,
    private readonly contextActionService: ContextualActionBarService,
    private readonly matDialog: MatDialog,
    private readonly finderService: Finder
  ) {}

  private static newFormGroup(finderService: Finder): FormGroup {
    return new FormGroup({
      path: new FormControl(null, Validators.required),
      name: new FormControl(
        null,
        Validators.required,
        makeNameAvailableValidator(finderService)
      ),
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
        this.ngNewForm$.next(
          NewWorkspaceComponent.newFormGroup(this.finderService)
        );
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
      this.ngNewForm$.next(
        NewWorkspaceComponent.newFormGroup(this.finderService)
      );
    });

    this.createNewWorkspace$.subscribe(() => {
      const form = this.ngNewForm$.value;
      if (form) {
        this.createNewWorkspace(form.value as NgNewInvocation);
      }
    });

    this.ngNewForm$
      .pipe(
        filter(form => Boolean(form)) as OperatorFunction<
          FormGroup | null,
          FormGroup
        >,
        switchMap(form => form.valueChanges)
      )
      .subscribe((formValue: any) => {
        const form = this.ngNewForm$.value;
        if (form && formValue.path) {
          this.contextActionService.contextualActions$.next({
            contextTitle: 'Create a New Angular Workspace',
            actions: [
              {
                name: 'Create',
                disabled: new BehaviorSubject(form.invalid),
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
      .open(NewWorkspaceDialogComponent, {
        disableClose: true,
        width: 'calc(100vw - 39px)',
        height: 'calc(100vh - 128px)',
        panelClass: 'create-new-workspace-dialog',
        maxWidth: '95vw',
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
      field.setValue(null);
    } else {
      this.selectedNode = node;
      field.setValue(node.path);
    }
  }
}

export function makeNameAvailableValidator(
  finderService: Finder
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const form = control.parent;
    const path = form.get('path');
    const name = form.get('name');
    return of(name && path ? `${path.value}/${name.value}` : null).pipe(
      switchMap(
        (p: null | string): Observable<null | Directory> =>
          p ? finderService.listFiles(p) : of(null)
      ),
      map(
        (d: null | Directory) => (!d || !d.exists ? null : { nameTaken: true })
      )
    );
  };
}
