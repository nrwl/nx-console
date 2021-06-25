import { dirname, join } from 'path';
import { Selection, TextDocument, Uri, window, workspace } from 'vscode';
import { getProjectLocations } from './find-workspace-json-target';
import { getRawWorkspace } from './get-raw-workspace';

export async function revealNxProject(
  projectName: string,
  target?: { name: string; configuration?: string }
) {
  const raw = getRawWorkspace();
  const rawWorkspace = raw.rawWorkspace;
  let workspaceJsonPath = raw.workspaceJsonPath;

  /**
   * if the project is a split config, just use the project.json as the "workspace.json"
   */
  if (typeof rawWorkspace.projects[projectName] === 'string') {
    const workspaceRootDir = dirname(workspaceJsonPath);
    workspaceJsonPath = join(
      workspaceRootDir,
      (rawWorkspace.projects[projectName] as unknown) as string,
      'project.json'
    );
  }

  const document: TextDocument = await workspace.openTextDocument(
    Uri.file(workspaceJsonPath)
  );

  const projectLocations = getProjectLocations(document, projectName);

  let offset = projectLocations[projectName].position;
  if (target) {
    const projectTarget = projectLocations[projectName].targets[target.name];
    const targetConfiguration =
      projectTarget.configurations?.[target.configuration || ''];

    if (targetConfiguration) {
      offset = targetConfiguration.position;
    } else {
      offset = projectTarget.position;
    }
  }

  const position = document.positionAt(offset);
  await window.showTextDocument(document, {
    selection: new Selection(position, position),
  });
}
