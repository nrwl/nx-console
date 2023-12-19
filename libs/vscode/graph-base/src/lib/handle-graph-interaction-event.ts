import {
  getNxWorkspacePath,
  getNxWorkspaceProjects,
} from '@nx-console/vscode/nx-workspace';
import { getTelemetry } from '@nx-console/vscode/utils';
import { join } from 'path';
import { commands, Uri } from 'vscode';
import { revealNxProject } from '@nx-console/vscode/nx-config-decoration';
import { CliTaskProvider } from '@nx-console/vscode/tasks';

export async function handleGraphInteractionEvent(event: {
  type: string;
  payload: any;
}): Promise<boolean> {
  if (event.type === 'file-click') {
    getTelemetry().featureUsed('nx.graph.openProjectEdgeFile');
    const workspacePath = await getNxWorkspacePath();

    commands.executeCommand(
      'vscode.open',
      Uri.file(join(workspacePath, event.payload))
    );
    return true;
  }
  if (event.type === 'open-project-config') {
    const projectName = event.payload;
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
      positional: event.payload,
      flags: [],
    });
    return true;
  }
  return false;
}
