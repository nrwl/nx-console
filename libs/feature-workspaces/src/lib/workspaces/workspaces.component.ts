import { Component } from '@angular/core';
import { Settings } from '@nxui/utils';
import { WorkspacesService } from '../workspaces.service';

@Component({
  selector: 'nxui-workspaces',
  templateUrl: './workspaces.component.html',
  styleUrls: ['./workspaces.component.css']
})
export class WorkspacesComponent {
  constructor(
    readonly settings: Settings,
    readonly workspacesService: WorkspacesService
  ) {}

  clearRecent() {
    this.settings.clear();
  }
}
