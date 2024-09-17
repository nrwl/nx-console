import { getProjectByPath } from '@nx-console/vscode/nx-workspace';
import { ExtensionContext, TextDocument, ViewColumn } from 'vscode';
import { ProjectDetailsPreview } from './project-details-preview';

export class ProjectDetailsManager {
  private previews: Map<string, ProjectDetailsPreview> = new Map();

  constructor(private context: ExtensionContext) {}

  async openProjectDetailsToSide(
    document: TextDocument,
    expandedTarget?: string
  ) {
    const path = document.uri.path;
    let preview = await this.findMatchingPreview(path);

    if (!preview) {
      preview = new ProjectDetailsPreview(path, this.context, expandedTarget);
      preview.onDispose(() => {
        this.previews.delete(path);
      });
      this.previews.set(path, preview);
    }

    preview.reveal(ViewColumn.Beside);
  }

  private async findMatchingPreview(
    path: string
  ): Promise<ProjectDetailsPreview | undefined> {
    console.log(
      'getting preview for',
      path,
      Array.from(this.previews.entries()).map((p) => ({
        path: p[0],
        root: p[1].projectRoot,
      }))
    );
    const directMatch = this.previews.get(path);
    if (directMatch) return directMatch;

    const projectRoot = (await getProjectByPath(path))?.root;
    if (!projectRoot) return;

    for (const [, preview] of this.previews) {
      if (preview.projectRoot === projectRoot) return preview;
    }

    return;
  }
}
