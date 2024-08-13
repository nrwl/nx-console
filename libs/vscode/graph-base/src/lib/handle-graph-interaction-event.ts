import { getNxWorkspacePath } from '@nx-console/vscode/configuration';
import { revealNxProject } from '@nx-console/vscode/nx-config-decoration';
import { getNxWorkspaceProjects } from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getTelemetry } from '@nx-console/vscode/telemetry';
import { join } from 'path';
import { commands, ShellExecution, Task, tasks, TaskScope, Uri } from 'vscode';
import { importNxPackagePath } from '@nx-console/shared/npm';

export async function handleGraphInteractionEventBase(event: {
  type: string;
  payload: any;
}): Promise<boolean> {
  if (event.type === 'file-click') {
    getTelemetry().logUsage('nx.graph.openProjectEdgeFile');
    const workspacePath = getNxWorkspacePath();

    commands.executeCommand(
      'vscode.open',
      Uri.file(join(workspacePath, event.payload.url))
    );
    return true;
  }
  if (event.type === 'open-project-config') {
    const projectName = event.payload.projectName;
    getTelemetry().logUsage('nx.graph.openProjectConfigFile');
    getNxWorkspaceProjects().then((projects) => {
      const root = projects[projectName]?.root;
      if (!root) return;
      revealNxProject(projectName, root);
    });
    return true;
  }
  if (event.type === 'run-task') {
    getTelemetry().logUsage('nx.graph.runTask');
    CliTaskProvider.instance.executeTask({
      command: 'run',
      positional: event.payload.taskId,
      flags: [],
    });
    return true;
  }

  if (event.type === 'run-help') {
    getTelemetry().logUsage('nx.graph.runHelp');
    const workspacePath = getNxWorkspacePath();
    const projectName = event.payload.projectName;
    const cmd = event.payload.helpCommand;
    const cwd = event.payload.helpCwd;

    getNxWorkspaceProjects().then((projects) => {
      const project = projects[projectName];
      if (!project) return;
      importNxPackagePath<typeof import('nx/src/devkit-exports')>(
        workspacePath,
        'src/devkit-exports'
      ).then(({ detectPackageManager }) => {
        const pkgManager = detectPackageManager(workspacePath);
        tasks.executeTask(
          new Task(
            {
              type: 'nxconsole-run-help',
            },
            TaskScope.Workspace,
            cmd,
            pkgManager,
            new ShellExecution(cmd, {
              cwd: cwd
                ? // CWD should be passed to match command CWD.
                  join(workspacePath, cwd)
                : // If CWD is not passed from Nx 19.4.0.
                  join(workspacePath, project.root),
            })
          )
        );
      });
    });
    return true;
  }

  if (event.type === 'nx-connect') {
    commands.executeCommand('nx.connectToCloud');
    return true;
  }

  return false;
}
