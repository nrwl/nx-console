import { Component, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { WorkspacesService } from '../workspaces.service';
import {
  DynamicFlatNode,
  ContextualActionBarService
} from '@angular-console/ui';
import { Subject } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-import-workspace',
  templateUrl: './import-workspace.component.html',
  styleUrls: ['./import-workspace.component.scss']
})
export class ImportWorkspaceComponent implements OnDestroy {
  private readonly invokeImport = new Subject<void>();

  private readonly invokeImportSubscription = this.invokeImport.subscribe(
    () => {
      if (!this.selectedNode) {
        throw new Error('Cannot import without a selection');
      }

      this.workspacesService.openWorkspace(this.selectedNode.path);
      this.contextActionService.contextualActions$.next(null);
    }
  );

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
    this.invokeImportSubscription.unsubscribe();
  }

  toggleNodeSelection(node: DynamicFlatNode) {
    if (this.selectedNode !== node) {
      this.selectedNode = node;

      this.contextActionService.contextualActions$.next({
        contextTitle: `Selected Workspace: ${node.file.name}`,
        actions: [
          {
            name: 'Import',
            invoke: this.invokeImport,
            disabled: new Subject()
          }
        ]
      });
    } else {
      this.contextActionService.contextualActions$.next(null);
    }
  }
}
