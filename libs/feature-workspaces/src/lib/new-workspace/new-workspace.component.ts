import { DynamicFlatNode } from '@angular-console/ui';
import {
  Component,
  OnInit,
  OnDestroy,
  QueryList,
  ViewChildren,
  ViewEncapsulation
} from '@angular/core';
import {
  AsyncValidatorFn,
  ValidationErrors,
  AbstractControl,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import { MatDialog, MatExpansionPanel } from '@angular/material';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { of, BehaviorSubject, Observable, Subject } from 'rxjs';
import {
  filter,
  map,
  publishReplay,
  refCount,
  switchMap,
  take,
  takeUntil
} from 'rxjs/operators';

import {
  NewWorkspaceDialogComponent,
  NgNewInvocation
} from './new-workspace-dialog.component';
import { Directory } from '@angular-console/schema';
import { Finder } from '@angular-console/utils';

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
export class NewWorkspaceComponent implements OnInit, OnDestroy {
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

  private readonly unsubscribe$: Subject<null> = new Subject();

  ngOnInit() {
    this.contextActionService.contextualActions$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(actions => {
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

    this.schematicCollectionsForNgNew$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(() => {
        this.ngNewForm$.next(
          NewWorkspaceComponent.newFormGroup(this.finderService)
        );
      });

    this.createNewWorkspace$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(() => {
        const form = this.ngNewForm$.value;
        if (form) {
          this.createNewWorkspace(form.value as NgNewInvocation);
        }
      });

    this.ngNewForm$
      .pipe(
        filter(form => Boolean(form)),
        switchMap((form: FormGroup) => form.statusChanges)
      )
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((formStatus: any) => {
        this.contextActionService.contextualActions$.next({
          contextTitle: 'Create a New Angular Workspace',
          actions: [
            {
              name: 'Create',
              disabled: new BehaviorSubject(formStatus !== 'VALID'),
              invoke: this.createNewWorkspace$
            }
          ]
        });
      });
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
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
    const pathCtrl = form.get('path');
    const nameCtrl = form.get('name');
    return of(
      nameCtrl && pathCtrl ? `${pathCtrl.value}/${nameCtrl.value}` : null
    ).pipe(
      switchMap(
        (workspacePath: null | string): Observable<null | Directory> =>
          workspacePath ? finderService.listFiles(workspacePath) : of(null)
      ),
      map(
        (d: null | Directory) => (!d || !d.exists ? null : { nameTaken: true })
      ),
      take(1)
    );
  };
}
