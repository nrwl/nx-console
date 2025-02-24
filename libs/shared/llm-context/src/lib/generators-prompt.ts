import { GeneratorCollectionInfo } from '@nx-console/shared-schema';
import { Logger, withTimeout } from '@nx-console/shared-utils';
import { getGenerators } from '@nx-console/shared-nx-workspace-info';

export async function getGeneratorsPrompt(
  generatorNamesAndDescriptions: {
    name: string;
    description: string;
  }[],
) {
  const generators = generatorNamesAndDescriptions
    .map(
      (nameAndDescription) =>
        `<${nameAndDescription.name}:[${nameAndDescription.description}]>`,
    )
    .join('');

  return `Here are the available generators and their descriptions. They are
formatted like <name:[description]>. You may pick one to
best match the user request and use the generator details tool to
retrieve the schema for more details.
${generators}`;
}

export async function getGeneratorNamesAndDescriptions(
  workspacePath: string,
  logger?: Logger,
): Promise<
  {
    name: string;
    description: string;
  }[]
> {
  let generators: GeneratorCollectionInfo[];
  try {
    generators = await withTimeout<GeneratorCollectionInfo[]>(
      async () => await getGenerators(workspacePath, undefined, logger),
      10000,
    );
  } catch (e) {
    generators = [];
  }

  return generators.map((generator) => ({
    name: generator.name,
    description: generator.data?.description ?? '',
  }));
}
