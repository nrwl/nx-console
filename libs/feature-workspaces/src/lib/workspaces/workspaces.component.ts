import {
  Settings,
  WorkspaceDescription,
  CommandRunner
} from '@angular-console/utils';
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
import { NewWorkspaceComponent } from '../new-workspace/new-workspace.component';
import { WorkspacesService } from '../workspaces.service';
import { startWith, shareReplay } from 'rxjs/operators';

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
  readonly commands$ = this.commandRunner.listAllCommands().pipe(shareReplay());

  constructor(
    readonly settings: Settings,
    readonly workspacesService: WorkspacesService,
    private readonly contextualActionBarService: ContextualActionBarService,
    private readonly matDialog: MatDialog,
    private readonly commandRunner: CommandRunner
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
      width: '760px',
      panelClass: 'new-workspace-dialog',
      autoFocus: false
    });
  }
}
