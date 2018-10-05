import { DynamicFlatNode } from '@angular-console/ui';
import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { Subject } from 'rxjs';

import { WorkspacesService } from '../workspaces.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-open-workspace',
  templateUrl: './open-workspace.component.html',
  styleUrls: ['./open-workspace.component.scss']
})
export class OpenWorkspaceComponent implements OnDestroy {
  private readonly invokeOpen = new Subject<void>();

  private readonly invokeOpenSubscription = this.invokeOpen.subscribe(() => {
    if (!this.selectedNode) {
      throw new Error('Cannot open without a selection');
    }

    this.workspacesService.openWorkspace(this.selectedNode.path);
    this.contextActionService.contextualActions$.next(null);
  });

  selectedNode: DynamicFlatNode | null = null;

  constructor(
    readonly workspacesService: WorkspacesService,
    private readonly contextActionService: ContextualActionBarService
  ) {
    this.contextActionService.contextualActions$.subscribe(actions => {
      if (!actions) {
        this.selectedNode = null;
      }
    });
  }

  disableNonAngularDirectory(node: DynamicFlatNode): boolean {
    return node.file.type !== 'angularDirectory';
  }

  ngOnDestroy() {
    this.invokeOpenSubscription.unsubscribe();
  }

  toggleNodeSelection(node: DynamicFlatNode) {
    if (this.selectedNode !== node) {
      this.selectedNode = node;

      this.contextActionService.contextualActions$.next({
        contextTitle: `Selected Workspace: ${node.file.name}`,
        actions: [
          {
            name: 'Open',
            invoke: this.invokeOpen,
            disabled: new Subject()
          }
        ]
      });
    } else {
      this.contextActionService.contextualActions$.next(null);
    }
  }
}
