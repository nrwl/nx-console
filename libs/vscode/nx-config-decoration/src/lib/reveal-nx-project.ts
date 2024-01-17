import { buildProjectPath } from '@nx-console/shared/utils';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { join } from 'path';
import {
  Selection,
  TextDocument,
  Uri,
  commands,
  window,
  workspace,
} from 'vscode';

import { getProjectLocations } from './get-project-locations';
import { fileExists } from '@nx-console/shared/file-system';

export async function revealNxProject(
  projectName: string,
  root: string,
  target?: { name: string; configuration?: string }
) {
  const workspacePath = WorkspaceConfigurationStore.instance.get(
    'nxWorkspacePath',
    ''
  );
  const projectPath = await buildProjectPath(workspacePath, root);
  const workspaceJsonPath = join(workspacePath, 'workspace.json');

  let path = workspacePath;
  if (projectPath) {
    path = projectPath;
  } else if (await fileExists(workspaceJsonPath)) {
    path = workspaceJsonPath;
  }

  const document: TextDocument = await workspace.openTextDocument(
    Uri.file(path)
  );

  const projectLocations = getProjectLocations(document, projectName);

  let offset = projectLocations[projectName].position;
  if (target) {
    const projectTarget = projectLocations[projectName].targets?.[target.name];
    if (projectTarget) {
      const targetConfiguration =
        projectTarget.configurations?.[target.configuration || ''];

      if (targetConfiguration) {
        offset = targetConfiguration.position;
      } else {
        offset = projectTarget.position;
      }
    }
  }

  const position = document.positionAt(offset);
  await window.showTextDocument(document, {
    selection: new Selection(position, position),
  });
  commands.executeCommand('nx.project-details.openToSide', target?.name);
}
