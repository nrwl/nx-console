import { GraphWebviewManager } from './legacy-2-graph-webview-manager';
import { NewGraphWebview, PartialHandleEventResult } from './new-graph-webview';

export class NewGraphWebviewManager
  implements GraphWebviewManager<PartialHandleEventResult>
{
  async focusProject(
    projectName: string,
    focusWebview?: boolean,
  ): Promise<PartialHandleEventResult> {
    throw new Error('Method not implemented');
  }
  selectProject(
    projectName: string,
    focusWebview?: boolean,
  ): Promise<PartialHandleEventResult> {
    throw new Error('Method not implemented.');
  }
  async focusTarget(
    projectName: string,
    targetName: string,
    focusWebview?: boolean,
  ): Promise<PartialHandleEventResult> {
    this.ensureNewTaskGraphWebview();
    return await this.newTaskGraphWebview.sendCommandToGraph({
      type: 'show',
      taskIds: [`task-${projectName}:${targetName}`],
    });
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
  private newProjectGraphWebview: NewGraphWebview | undefined;
  private newTaskGraphWebview: NewGraphWebview | undefined;

  private ensureNewProjectGraphWebview() {
    if (!this.newProjectGraphWebview) {
      this.newProjectGraphWebview = new NewGraphWebview('project', () => {
        this.newProjectGraphWebview = undefined;
      });
      this.newProjectGraphWebview.reveal();
    }
  }

  private ensureNewTaskGraphWebview() {
    if (!this.newTaskGraphWebview) {
      this.newTaskGraphWebview = new NewGraphWebview('task', () => {
        this.newTaskGraphWebview = undefined;
      });
      this.newTaskGraphWebview.reveal();
    }
  }

  public async showAllProjects(): Promise<PartialHandleEventResult> {
    this.ensureNewProjectGraphWebview();
    return await this.newProjectGraphWebview.sendCommandToGraph({
      type: 'showAll',
      autoExpand: true,
    });
  }
}
