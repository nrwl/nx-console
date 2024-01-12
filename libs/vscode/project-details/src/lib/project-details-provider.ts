import { getNxWorkspaceProjects } from '@nx-console/vscode/nx-workspace';
import {
  CancellationToken,
  Event,
  TextDocumentContentProvider,
  Uri,
} from 'vscode';

export class ProjectDetailsProvider implements TextDocumentContentProvider {
  onDidChange?: Event<Uri> | undefined;

  async provideTextDocumentContent(
    uri: Uri,
    token: CancellationToken
  ): Promise<string | undefined> {
    const projectName = uri.path.replace('.project.json', '');
    const project = (await getNxWorkspaceProjects())?.[projectName] as any;
    delete project.files;
    delete project['$schema'];

    // Iterate over project and delete empty object or array children
    const deleteEmptyChildren = (obj: any) => {
      for (const key in obj) {
        if (typeof obj[key] === 'object') {
          deleteEmptyChildren(obj[key]);
          if (Array.isArray(obj[key]) && obj[key].length === 0) {
            delete obj[key];
          } else if (Object.keys(obj[key]).length === 0) {
            delete obj[key];
          }
        }
      }
    };

    deleteEmptyChildren(project);

    return JSON.stringify(project, null, 2);
  }
}
