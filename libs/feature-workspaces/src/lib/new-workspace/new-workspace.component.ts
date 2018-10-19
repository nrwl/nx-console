import { Directory } from '@angular-console/schema';
import {
  CommandRunner,
  Finder,
  IncrementalCommandOutput,
  CommandStatus
} from '@angular-console/utils';
import {
  Component,
  ElementRef,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators
} from '@angular/forms';
import {
  MatDialogRef,
  MatSelectionListChange,
  MatVerticalStepper
} from '@angular/material';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import {
  map,
  publishReplay,
  refCount,
  switchMap,
  take,
  tap
} from 'rxjs/operators';

import { NgNew, NgNewGQL, SchematicCollectionsGQL } from '../generated/graphql';
import { WorkspacesService } from '../workspaces.service';

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
export class NewWorkspaceComponent {
  @ViewChild(MatVerticalStepper) verticalStepper: MatVerticalStepper;
  commandOutput$?: Observable<IncrementalCommandOutput>;

  command?: string;

  ngNewForm = this.fb.group({
    path: this.fb.control(null, Validators.required),
    name: this.fb.control(
      null,
      Validators.required,
      makeNameAvailableValidator(this.finderService)
    ),
    collection: this.fb.control(null, Validators.required)
  });

  schematicCollectionsForNgNew$ = this.schematicCollectionsGQL.fetch().pipe(
    map(r => r.data.schematicCollections),
    publishReplay(1),
    refCount()
  );

  autofocusInput() {
    const autofocus = (this.elementRef
      .nativeElement as HTMLElement).querySelectorAll('.autofocus')[
      this.verticalStepper.selectedIndex
    ] as any;

    autofocus.focus();
  }

  constructor(
    private readonly elementRef: ElementRef,
    private readonly router: Router,
    private readonly dialogRef: MatDialogRef<NewWorkspaceComponent>,
    private readonly fb: FormBuilder,
    private readonly finderService: Finder,
    private readonly schematicCollectionsGQL: SchematicCollectionsGQL,
    private readonly workspacesService: WorkspacesService,
    private readonly ngNewGQL: NgNewGQL,
    private readonly commandRunner: CommandRunner
  ) {}

  handleSelection(event: MatSelectionListChange) {
    // Workaround for https://github.com/angular/material2/issues/7157
    if (event.option.selected) {
      event.source.deselectAll();
      event.option._setSelected(true);
      this.ngNewForm.controls.collection.setValue(event.option.value);
    } else {
      this.ngNewForm.controls.collection.setValue(null);
    }
  }

  selectParentDirectory() {
    this.workspacesService
      .selectDirectoryForNewWorkspace()
      .subscribe(result => {
        if (result && result.selectedDirectoryPath) {
          this.ngNewForm.controls.path.setValue(result.selectedDirectoryPath);
          this.verticalStepper.next();
        }
      });
  }

  createNewWorkspace() {
    if (this.ngNewForm.valid) {
      const ngNewInvocation: NgNew.Variables = this.ngNewForm.value;
      this.command = `ng new ${name} --collection=${
        ngNewInvocation.collection
      }`;
      this.commandOutput$ = this.commandRunner
        .runCommand(this.ngNewGQL.mutate(ngNewInvocation), false)
        .pipe(
          tap(command => {
            if (command.status === CommandStatus.SUCCESSFUL) {
              this.dialogRef.close();
              this.router.navigate([
                '/workspace',
                `${ngNewInvocation.path}/${ngNewInvocation.name}`,
                'projects'
              ]);
            }
          })
        );
    }
  }

  trackByName(_: number, collection: SchematicCollectionForNgNew) {
    return collection.name;
  }
}

export function makeNameAvailableValidator(
  finderService: Finder
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const form = control.parent as FormGroup;
    const pathCtrl = form.controls.path;
    const nameCtrl = form.controls.name;

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
