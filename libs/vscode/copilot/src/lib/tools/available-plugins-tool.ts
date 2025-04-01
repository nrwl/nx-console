import { getPluginsInformation } from '@nx-console/shared-llm-context';
import { getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { vscodeLogger } from '@nx-console/vscode-utils';
import {
  CancellationToken,
  LanguageModelTextPart,
  LanguageModelTool,
  LanguageModelToolInvocationOptions,
  LanguageModelToolInvocationPrepareOptions,
  LanguageModelToolResult,
  PreparedToolInvocation,
} from 'vscode';

export class AvailablePluginsTool implements LanguageModelTool<unknown> {
  async invoke(
    options: LanguageModelToolInvocationOptions<unknown>,
    token: CancellationToken,
  ): Promise<LanguageModelToolResult> {
    getTelemetry().logUsage('ai.tool-call', {
      tool: 'nx_available_plugins',
    });

    try {
      const nxWorkspace = await getNxWorkspace();
      const nxVersion = nxWorkspace?.nxVersion;
      const workspacePath = nxWorkspace?.workspacePath;

      const pluginsInfo = await getPluginsInformation(
        nxVersion,
        workspacePath,
        nxWorkspace,
        vscodeLogger,
      );

      return new LanguageModelToolResult([
        new LanguageModelTextPart(pluginsInfo.formattedText),
      ]);
    } catch (error) {
      return new LanguageModelToolResult([
        new LanguageModelTextPart(`Error retrieving Nx plugins: ${error}`),
      ]);
    }
  }

  prepareInvocation(
    options: LanguageModelToolInvocationPrepareOptions<unknown>,
    token: CancellationToken,
  ): PreparedToolInvocation {
    return {
      invocationMessage: 'Fetching available Nx plugins',
    };
  }
}
