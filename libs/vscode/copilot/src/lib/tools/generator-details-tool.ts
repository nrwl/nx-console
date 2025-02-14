import { getGenerators } from '@nx-console/vscode-nx-workspace';
import { readFile } from 'fs/promises';
import {
  CancellationToken,
  LanguageModelTextPart,
  LanguageModelTool,
  LanguageModelToolInvocationOptions,
  LanguageModelToolInvocationPrepareOptions,
  LanguageModelToolResult,
  PreparedToolInvocation,
  ProviderResult,
} from 'vscode';

export interface GeneratorDetailsToolInput {
  generatorName: string;
}

export class GeneratorDetailsTool
  implements LanguageModelTool<GeneratorDetailsToolInput>
{
  async invoke(
    options: LanguageModelToolInvocationOptions<GeneratorDetailsToolInput>,
    token: CancellationToken
  ): Promise<LanguageModelToolResult> {
    const params = options.input as GeneratorDetailsToolInput;

    const generatorSchemas = await getGeneratorSchemas();

    const schema = generatorSchemas.find(
      (schema) => schema.name === params.generatorName
    );

    return new LanguageModelToolResult([
      new LanguageModelTextPart(
        `Found generator schema for ${params.generatorName}: ${JSON.stringify(
          schema
        )}`
      ),
    ]);
  }

  prepareInvocation(
    options: LanguageModelToolInvocationPrepareOptions<GeneratorDetailsToolInput>,
    token: CancellationToken
  ): PreparedToolInvocation {
    return {
      invocationMessage: 'Reading generator schema...',
    };
  }
}

async function getGeneratorSchemas() {
  const generators = await getGenerators();

  const schemas = [];
  for (const generator of generators) {
    if (generator.schemaPath) {
      try {
        const schemaContent = JSON.parse(
          await readFile(generator.schemaPath, 'utf-8')
        );
        delete schemaContent['$schema'];
        delete schemaContent['$id'];
        schemaContent.name = generator.name;
        schemas.push(schemaContent);
      } catch (error) {
        console.error(
          `Failed to read schema for generator ${generator.name}:`,
          error
        );
      }
    }
  }
  return schemas;
}
