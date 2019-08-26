import {
  Settings,
  SettingsModels,
  CommandRunner,
  Telemetry
} from '@angular-console/utils';
import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { NewWorkspaceComponent } from '../new-workspace/new-workspace.component';
import { WorkspacesService } from '../workspaces.service';
import { shareReplay } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-workspaces',
  templateUrl: './workspaces.component.html',
  styleUrls: ['./workspaces.component.scss'],
  animations: [
    trigger('growShrink', [
      state('void', style({ height: 0 })),
      state('*', style({ height: '*' })),
      transition(`:enter`, animate(`300ms cubic-bezier(0.4, 0.0, 0.2, 1)`)),
      transition(`:leave`, animate(`300ms cubic-bezier(0.4, 0.0, 0.2, 1)`))
    ])
  ]
})
export class WorkspacesComponent implements OnInit {
  readonly commands$ = this.commandRunner.listAllCommands().pipe(shareReplay());

  constructor(
    private readonly telemetry: Telemetry,
    readonly settings: Settings,
    readonly workspacesService: WorkspacesService,
    private readonly contextualActionBarService: ContextualActionBarService,
    private readonly matDialog: MatDialog,
    private readonly commandRunner: CommandRunner
  ) {}

  trackByPath(_: number, w: SettingsModels.Recent) {
    return w.path;
  }

  ngOnInit() {
    this.telemetry.screenViewed('Workspaces');
    if (this.settings.getRecentWorkspaces().length === 0) {
      this.contextualActionBarService.breadcrumbs$.next([
        { title: 'Welcome to Angular Console!' }
      ]);
    } else {
      this.contextualActionBarService.breadcrumbs$.next([
        { title: 'Select, Import or Create a Workspace' }
      ]);
    }
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
