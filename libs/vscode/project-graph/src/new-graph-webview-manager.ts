import { GraphWebviewManager } from './legacy-2-graph-webview-manager';
import { NewGraphWebview, PartialHandleEventResult } from './new-graph-webview';

export class NewGraphWebviewManager
  implements GraphWebviewManager<PartialHandleEventResult>
{
  focusProject(
    projectName: string,
    focusWebview?: boolean,
  ): Promise<PartialHandleEventResult> {
    throw new Error('Method not implemented.');
  }
  selectProject(
    projectName: string,
    focusWebview?: boolean,
  ): Promise<PartialHandleEventResult> {
    throw new Error('Method not implemented.');
  }
  focusTarget(
    projectName: string,
    targetName: string,
    focusWebview?: boolean,
  ): Promise<PartialHandleEventResult> {
    throw new Error('Method not implemented.');
  }
  showAllTargetsByName(
    targetName: string,
    focusWebview?: boolean,
  ): Promise<PartialHandleEventResult> {
    throw new Error('Method not implemented.');
  }
  showAffectedProjects(
    focusWebview?: boolean,
  ): Promise<PartialHandleEventResult> {
    throw new Error('Method not implemented.');
  }
  private newGraphWebview: NewGraphWebview | undefined;

  private ensureNewGraphWebview() {
    if (!this.newGraphWebview) {
      this.newGraphWebview = new NewGraphWebview(() => {
        this.newGraphWebview = undefined;
      });
      this.newGraphWebview.reveal();
    }
  }

  public async showAllProjects(): Promise<PartialHandleEventResult> {
    this.ensureNewGraphWebview();
    return await this.newGraphWebview.sendCommandToGraph({
      type: 'showAll',
      autoExpand: true,
    });
  }
}
