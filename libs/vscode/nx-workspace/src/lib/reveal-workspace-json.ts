import { Selection, TextDocument, Uri, window, workspace } from 'vscode';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { join } from 'path';
import { findWorkspaceJsonTarget } from './find-workspace-json-target';

export async function revealNxProject(
  projectName: string,
  target?: { name: string; configuration?: string }
) {
  const workspaceJson = Uri.file(
    join(WorkspaceConfigurationStore.instance.get('nxWorkspaceJsonPath', ''))
  );
  const document: TextDocument = await workspace.openTextDocument(
    workspaceJson
  );
  const offset = findWorkspaceJsonTarget(document, projectName, target);
  const position = document.positionAt(offset);
  await window.showTextDocument(document, {
    selection: new Selection(position, position),
  });
}
