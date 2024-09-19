import {
  getNxVersion,
  getProjectByPath,
} from '@nx-console/vscode/nx-workspace';
import { showNoNxVersionMessage } from '@nx-console/vscode/output-channels';
import { ExtensionContext, TextDocument, ViewColumn } from 'vscode';
import {
  OldProjectDetailsPreview,
  ProjectDetailsPreview,
} from './project-details-preview';

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
      const nxVersion = await getNxVersion();
      if (!nxVersion) {
        showNoNxVersionMessage();
        return;
      }

      preview = new OldProjectDetailsPreview(
        path,
        this.context,
        expandedTarget
      );
      // }
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
