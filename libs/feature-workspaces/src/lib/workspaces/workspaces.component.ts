import { Settings, WorkspaceDescription } from '@angular-console/utils';
import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WorkspacesService } from '../workspaces.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
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
export class WorkspacesComponent {
  constructor(
    readonly settings: Settings,
    readonly workspacesService: WorkspacesService
  ) {}

  trackByPath(_: number, w: WorkspaceDescription) {
    return w.path;
  }
}
