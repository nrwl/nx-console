import { getNxWorkspaceProjects } from '@nx-console/vscode-nx-workspace';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { getTaskGraphVisualizationMessage } from '@nx-console/shared-llm-context';
import {
  CancellationToken,
  commands,
  LanguageModelTextPart,
  LanguageModelTool,
  LanguageModelToolInvocationOptions,
  LanguageModelToolInvocationPrepareOptions,
  LanguageModelToolResult,
  PreparedToolInvocation,
} from 'vscode';

export interface VisualizeTaskGraphToolInput {
  projectName: string;
  taskName: string;
}

export class VisualizeTaskGraphTool
  implements LanguageModelTool<VisualizeTaskGraphToolInput>
{
  async invoke(
    options: LanguageModelToolInvocationOptions<VisualizeTaskGraphToolInput>,
    token: CancellationToken,
  ): Promise<LanguageModelToolResult> {
    const { projectName, taskName } = options.input;

    getTelemetry().logUsage('ai.tool-call', {
      tool: 'nx_visualize_task_graph',
    });

    const workspaceProjects = await getNxWorkspaceProjects();
    if (!workspaceProjects || !workspaceProjects[projectName]) {
      throw new Error(`Cannot find project "${projectName}"`);
    }
    if (!workspaceProjects[projectName].data.targets?.[taskName]) {
      throw new Error(
        `Cannot find task "${taskName}" in project "${projectName}"`,
      );
    }

    await commands.executeCommand('nx.graph.task', { projectName, taskName });

    return new LanguageModelToolResult([
      new LanguageModelTextPart(
        getTaskGraphVisualizationMessage(projectName, taskName),
      ),
    ]);
  }

  prepareInvocation(
    options: LanguageModelToolInvocationPrepareOptions<VisualizeTaskGraphToolInput>,
    token: CancellationToken,
  ): PreparedToolInvocation {
    return {
      invocationMessage: `Opening task graph visualization for "${options.input.taskName}" in project "${options.input.projectName}"`,
    };
  }
}
