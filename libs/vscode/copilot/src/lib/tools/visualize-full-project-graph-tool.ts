import { getTelemetry } from '@nx-console/vscode-telemetry';
import { getProjectGraphVisualizationMessage } from '@nx-console/shared-llm-context';
import { commands } from 'vscode';
import {
  CancellationToken,
  LanguageModelTextPart,
  LanguageModelTool,
  LanguageModelToolInvocationOptions,
  LanguageModelToolInvocationPrepareOptions,
  LanguageModelToolResult,
  PreparedToolInvocation,
} from 'vscode';

export class VisualizeFullProjectGraphTool
  implements LanguageModelTool<unknown>
{
  async invoke(
    options: LanguageModelToolInvocationOptions<unknown>,
    token: CancellationToken,
  ): Promise<LanguageModelToolResult> {
    getTelemetry().logUsage('ai.tool-call', {
      tool: 'nx_visualize_full_project_graph',
    });

    try {
      // Execute the VS Code command to show the full project graph
      await commands.executeCommand('nx.graph.showAll');

      return new LanguageModelToolResult([
        new LanguageModelTextPart(getProjectGraphVisualizationMessage()),
      ]);
    } catch (e) {
      return new LanguageModelToolResult([
        new LanguageModelTextPart(`Error visualizing project graph: ${e}`),
      ]);
    }
  }

  prepareInvocation(
    options: LanguageModelToolInvocationPrepareOptions<unknown>,
    token: CancellationToken,
  ): PreparedToolInvocation {
    return {
      invocationMessage: 'Opening full project graph',
    };
  }
}
