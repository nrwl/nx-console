import { Component } from '@angular/core';
import { WorkspacesService } from '../workspaces.service';

@Component({
  selector: 'nxui-import-workspace',
  templateUrl: './import-workspace.component.html',
  styleUrls: ['./import-workspace.component.scss']
})
export class ImportWorkspaceComponent {
  constructor(readonly workspacesService: WorkspacesService) {}
}
