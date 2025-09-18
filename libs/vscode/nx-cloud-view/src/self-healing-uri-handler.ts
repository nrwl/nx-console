import { window, Uri, workspace, env } from 'vscode';
import { getNxCloudId } from '@nx-console/shared-nx-cloud';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import { applyFixLocallyWithNxCloud } from './apply-fix-locally';
import { getTelemetry } from '@nx-console/vscode-telemetry';

export async function handleSelfHealingUri(uri: Uri): Promise<void> {
  if (!uri.path.startsWith('/self-healing/')) {
    return;
  }

  getTelemetry().logUsage('cloud.self-healing-uri', { uri: uri.toString() });

  // Parse the URI: vscode://nrwl.angular-console/self-healing/{workspaceId}/{fixId}
  const pathParts = uri.path.split('/').filter((p) => p);

  if (pathParts.length < 3 || pathParts[0] !== 'self-healing') {
    window.showErrorMessage('Invalid self-healing URI format');
    return;
  }

  const workspaceId = pathParts[1];
  const fixId = pathParts[2];

  getOutputChannel().appendLine(
    `Handling self-healing URI: workspace=${workspaceId}, fix=${fixId}`,
  );

  // Find the matching workspace by comparing nxCloudId
  const matchedWorkspace = await findWorkspaceByCloudId(workspaceId);

  if (!matchedWorkspace) {
    await handleWorkspaceNotFound(workspaceId, fixId);
    return;
  }

  await applyFixLocallyWithNxCloud(fixId);
}

async function findWorkspaceByCloudId(
  targetCloudId: string,
): Promise<string | undefined> {
  // Check if we have any workspace folders open
  if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
    return undefined;
  }

  // For single workspace, check if it matches
  if (workspace.workspaceFolders.length === 1) {
    const workspacePath = workspace.workspaceFolders[0].uri.fsPath;
    const cloudId = await getNxCloudId(workspacePath);

    if (cloudId === targetCloudId) {
      return workspacePath;
    }
  } else {
    // For multi-root workspaces, check each one
    for (const folder of workspace.workspaceFolders) {
      const workspacePath = folder.uri.fsPath;
      const cloudId = await getNxCloudId(workspacePath);

      if (cloudId === targetCloudId) {
        getOutputChannel().appendLine(
          `Found matching workspace: ${workspacePath}`,
        );
        return workspacePath;
      }
    }
  }

  return undefined;
}

async function handleWorkspaceNotFound(
  workspaceId: string,
  fixId: string,
): Promise<void> {
  const command = `npx nx-cloud apply-locally ${fixId}`;

  getOutputChannel().appendLine(
    `[Instance ${env.sessionId}] No matching workspace found for Cloud ID: ${workspaceId}`,
  );

  const selection = await window.showErrorMessage(
    `This instance does not contain the Nx workspace with Cloud ID: ${workspaceId}.
You can copy the command, and then run it manually in the correct Nx workspace.`,
    'Copy Command',
  );

  if (selection === 'Copy Command') {
    await env.clipboard.writeText(command);
    window.showInformationMessage(
      `Command copied to clipboard: ${command}. ` +
        `Navigate to your Nx workspace directory and paste this command in the terminal.`,
    );
  }
}
