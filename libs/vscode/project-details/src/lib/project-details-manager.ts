import { getProjectByPath } from '@nx-console/vscode/nx-workspace';
import { showNoProjectAtPathMessage } from '@nx-console/vscode/utils';
import { ExtensionContext, TextDocument, ViewColumn } from 'vscode';
import { ProjectDetailsPreview } from './project-details-preview';

export class ProjectDetailsManager {
  private previews: Map<string, ProjectDetailsPreview> = new Map();

  constructor(private context: ExtensionContext) {}

  async openProjectDetailsToSide(
    document: TextDocument,
    expandedTarget?: string
  ) {
    const project = await getProjectByPath(document.uri.path);
    if (!project) {
      showNoProjectAtPathMessage(document.uri.path);
      return;
    }

    let preview = this.previews.get(project.root);
    if (!preview) {
      if (!project.name) {
        return;
      }
      preview = new ProjectDetailsPreview(
        project.name,
        this.context,
        expandedTarget
      );
      preview.onDispose(() => {
        this.previews.delete(project.root);
      });
      this.previews.set(project.root, preview);
    }

    preview.reveal(ViewColumn.Beside);
  }
}
