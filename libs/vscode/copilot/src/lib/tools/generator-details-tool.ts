import { getGeneratorSchema } from '@nx-console/shared-llm-context';
import { getGenerators } from '@nx-console/vscode-nx-workspace';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import {
  CancellationToken,
  LanguageModelTextPart,
  LanguageModelTool,
  LanguageModelToolInvocationOptions,
  LanguageModelToolInvocationPrepareOptions,
  LanguageModelToolResult,
  PreparedToolInvocation,
} from 'vscode';

export interface GeneratorDetailsToolInput {
  generatorName: string;
}

export class GeneratorDetailsTool
  implements LanguageModelTool<GeneratorDetailsToolInput>
{
  async invoke(
    options: LanguageModelToolInvocationOptions<GeneratorDetailsToolInput>,
    token: CancellationToken,
  ): Promise<LanguageModelToolResult> {
    getTelemetry().logUsage('ai.tool-call', {
      tool: 'nx_generator_details',
    });

    const params = options.input as GeneratorDetailsToolInput;

    const generators = await getGenerators();

    const schema = await getGeneratorSchema(params.generatorName, generators);

    if (!schema) {
      return new LanguageModelToolResult([
        new LanguageModelTextPart(
          `Generator ${params.generatorName} not found`,
        ),
      ]);
    }

    return new LanguageModelToolResult([
      new LanguageModelTextPart(
        `Found generator schema for ${params.generatorName}: ${JSON.stringify(
          schema,
        )}`,
      ),
    ]);
  }

  prepareInvocation(
    options: LanguageModelToolInvocationPrepareOptions<GeneratorDetailsToolInput>,
    token: CancellationToken,
  ): PreparedToolInvocation {
    return {
      invocationMessage: 'Reading generator schema...',
    };
  }
}
