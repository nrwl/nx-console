import { getProjectByPath } from '@nx-console/vscode/nx-workspace';
import { showNoProjectAtPathMessage } from '@nx-console/vscode/utils';
import { ExtensionContext, Uri, ViewColumn } from 'vscode';
import { ProjectDetailsPreview } from './project-details-preview';

export class ProjectDetailsManager {
  private previews: Map<string, ProjectDetailsPreview> = new Map();

  constructor(private context: ExtensionContext) {}

  async openProjectDetailsToSide(uri: Uri) {
    const project = await getProjectByPath(uri.path);
    if (!project) {
      showNoProjectAtPathMessage(uri.path);
      return;
    }

    let preview = this.previews.get(project.root);
    if (!preview) {
      if (!project.name) {
        return;
      }
      preview = new ProjectDetailsPreview(project.name, this.context);
      preview.onDispose(() => {
        this.previews.delete(project.root);
      });
      this.previews.set(project.root, preview);
    }

    preview.reveal(ViewColumn.Beside);
  }
}
