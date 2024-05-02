import { getNxWorkspacePath } from '@nx-console/vscode/configuration';
import { revealNxProject } from '@nx-console/vscode/nx-config-decoration';
import {
  getNxWorkspacePathFromNxls,
  getNxWorkspaceProjects,
} from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getTelemetry } from '@nx-console/vscode/utils';
import { join } from 'path';
import { Uri, commands } from 'vscode';

export async function handleGraphInteractionEventBase(event: {
  type: string;
  payload: any;
}): Promise<boolean> {
  if (event.type === 'file-click') {
    getTelemetry().featureUsed('nx.graph.openProjectEdgeFile');
    const workspacePath = getNxWorkspacePath();

    commands.executeCommand(
      'vscode.open',
      Uri.file(join(workspacePath, event.payload.url))
    );
    return true;
  }
  if (event.type === 'open-project-config') {
    const projectName = event.payload.projectName;
    getTelemetry().featureUsed('nx.graph.openProjectConfigFile');
    getNxWorkspaceProjects().then((projects) => {
      const root = projects[projectName]?.root;
      if (!root) return;
      revealNxProject(projectName, root);
    });
    return true;
  }
  if (event.type === 'run-task') {
    getTelemetry().featureUsed('nx.graph.runTask');
    CliTaskProvider.instance.executeTask({
      command: 'run',
      positional: event.payload.taskId,
      flags: [],
    });
    return true;
  }

  return false;
}
