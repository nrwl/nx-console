import { openGenerateUIPrefilled } from '@nx-console/vscode-generate-ui-webview';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import {
  createGeneratorLogFileName,
  createGeneratorUiResponseMessage,
} from '@nx-console/shared-llm-context';
import {
  CancellationToken,
  LanguageModelTextPart,
  LanguageModelTool,
  LanguageModelToolInvocationOptions,
  LanguageModelToolInvocationPrepareOptions,
  LanguageModelToolResult,
  PreparedToolInvocation,
} from 'vscode';

export interface OpenGenerateUiToolInput {
  generatorName: string;
  options: Record<string, unknown>;
  cwd?: string;
}

export class OpenGenerateUiTool
  implements LanguageModelTool<OpenGenerateUiToolInput>
{
  async invoke(
    options: LanguageModelToolInvocationOptions<OpenGenerateUiToolInput>,
    token: CancellationToken,
  ): Promise<LanguageModelToolResult> {
    getTelemetry().logUsage('ai.tool-call', {
      tool: 'nx_open_generate_ui',
    });

    const params = options.input;
    const workspacePath = getNxWorkspacePath();

    if (!workspacePath) {
      return new LanguageModelToolResult([
        new LanguageModelTextPart('Error: Workspace path not set'),
      ]);
    }

    try {
      await openGenerateUIPrefilled({
        _: ['generate', params.generatorName],
        $0: 'nx',
        ...(params.options || {}),
        ...(params.cwd ? { cwd: params.cwd } : {}),
      });

      const finalFileName = await createGeneratorLogFileName(
        workspacePath,
        params.generatorName,
      );

      return new LanguageModelToolResult([
        new LanguageModelTextPart(
          createGeneratorUiResponseMessage(params.generatorName, finalFileName),
        ),
      ]);
    } catch (e) {
      return new LanguageModelToolResult([
        new LanguageModelTextPart(`Error opening generate UI: ${e}`),
      ]);
    }
  }

  prepareInvocation(
    options: LanguageModelToolInvocationPrepareOptions<OpenGenerateUiToolInput>,
    token: CancellationToken,
  ): PreparedToolInvocation {
    return {
      invocationMessage: 'Opening Nx generator UI',
    };
  }
}
