import { CommandRunner, CommandStatus } from '@angular-console/utils';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Router } from '@angular/router';
import gql from 'graphql-tag';
import { tap } from 'rxjs/operators';
import { NgNewGQL } from '../generated/graphql';

export interface NgNewInvocation {
  name: string;
  path: string;
  collection: string;
}

@Component({
  selector: 'angular-console-new-workspace-dialog',
  template: `
      <ui-terminal [command]="command" [outChunk]="(commandOutput$|async)?.outChunk"></ui-terminal>
    `
})
export class NewWorkspaceDialogComponent {
  command = `ng new ${this.data.ngNewInvocation.name} --collection=${
    this.data.ngNewInvocation.collection
  }`;

  commandOutput$ = this.commandRunner
    .runCommand(this.ngNewGQL.mutate(this.data.ngNewInvocation), false)
    .pipe(
      tap(command => {
        if (command.status === CommandStatus.SUCCESSFUL) {
          this.dialogRef.close();
          this.router.navigate([
            '/workspace',
            `${this.data.ngNewInvocation.path}/${
              this.data.ngNewInvocation.name
            }`,
            'projects'
          ]);
        }
      })
    );

  constructor(
    private readonly dialogRef: MatDialogRef<NewWorkspaceDialogComponent>,
    private readonly commandRunner: CommandRunner,
    private readonly router: Router,
    private readonly ngNewGQL: NgNewGQL,
    @Inject(MAT_DIALOG_DATA)
    readonly data: {
      ngNewInvocation: NgNewInvocation;
    }
  ) {}
}
