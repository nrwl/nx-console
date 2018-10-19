import { Settings, WorkspaceDescription } from '@angular-console/utils';
import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { map, tap, first } from 'rxjs/operators';

import { GetDirectoryPathGQL, GetDirectoryPath } from '../generated/graphql';
import { NewWorkspaceComponent } from '../new-workspace/new-workspace.component';
import { WorkspacesService } from '../workspaces.service';

@Component({
  selector: 'angular-console-workspaces',
  templateUrl: './workspaces.component.html',
  styleUrls: ['./workspaces.component.scss'],
  animations: [
    trigger('growShrink', [
      state('void', style({ height: 0 })),
      state('*', style({ height: '*' })),
      transition(`:enter`, animate(`250ms ease-in-out`)),
      transition(`:leave`, animate(`250ms ease-in-out`))
    ])
  ]
})
export class WorkspacesComponent implements OnInit {
  constructor(
    readonly settings: Settings,
    readonly workspacesService: WorkspacesService,
    private readonly contextualActionBarService: ContextualActionBarService,
    private readonly matDialog: MatDialog
  ) {}

  trackByPath(_: number, w: WorkspaceDescription) {
    return w.path;
  }

  ngOnInit() {
    this.contextualActionBarService.breadcrumbs$.next([
      { title: 'Select an Angular Workspace' }
    ]);
  }

  importExistingWorkspace() {
    this.workspacesService.selectExistingWorkspace().subscribe(result => {
      if (result && result.selectedDirectoryPath) {
        this.workspacesService.openWorkspace(result.selectedDirectoryPath);
      }
    });
  }

  createNewWorkspace() {
    this.matDialog.open(NewWorkspaceComponent, {
      disableClose: true,
      width: '560px',
      panelClass: 'new-workspace-dialog',
      autoFocus: false
    });
  }
}
