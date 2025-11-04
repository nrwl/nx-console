import { buildProjectPath } from '@nx-console/shared-file-system';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { join } from 'path';
import {
  commands,
  Selection,
  TextDocument,
  Uri,
  window,
  workspace,
} from 'vscode';

import { fileExists } from '@nx-console/shared-file-system';
import { getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { getProjectLocations } from './get-project-locations';

export async function revealNxProject(
  projectName: string,
  root: string,
  target?: { name: string; configuration?: string },
) {
  const workspacePath = getNxWorkspacePath();

  const projectOrPackageJsonPath = await buildProjectPath(workspacePath, root);

  const path =
    projectOrPackageJsonPath ??
    (await getProjectFileFromSourceMaps(projectName, workspacePath));

  if (!path) {
    window.showErrorMessage(
      `Could not find project configuration file for project ${projectName}`,
    );
    return;
  }

  const document: TextDocument = await workspace.openTextDocument(
    Uri.file(path),
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
  commands.executeCommand('nx.project-details.openToSide', {
    expandTarget: target?.name,
  });
}

async function getProjectFileFromSourceMaps(
  projectName: string,
  workspacePath: string,
): Promise<string | undefined> {
  const nxWorkspace = await getNxWorkspace();
  if (!nxWorkspace) {
    return;
  }
  // each project in the source maps is keyed by the project root
  const { sourceMaps, projectGraph } = nxWorkspace;
  const project = projectGraph.nodes[projectName];
  if (!project) {
    return;
  }
  const sourceMap = sourceMaps?.[project.data.root];
  if (!sourceMap) {
    return;
  }

  // source maps are stored by key with the file and plugin as values, e.g.
  //  "root": [
  //  "apps/my-api/my-api.csproj",
  //  "@nx/dotnet"
  //  ],
  const property =
    sourceMap['root'] ?? sourceMap['name'] ?? Object.values(sourceMap)?.[0];
  if (!property) {
    return;
  }
  const projectFile = property[0];
  if (!projectFile) {
    return;
  }
  const projectFilePath = join(workspacePath, projectFile);
  if (await fileExists(projectFilePath)) {
    return projectFilePath;
  }
  return;
}
