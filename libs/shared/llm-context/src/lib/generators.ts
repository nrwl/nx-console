import { GeneratorCollectionInfo } from '@nx-console/shared-schema';

export function getGeneratorsPrompt(
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
  generators: GeneratorCollectionInfo[],
): Promise<
  {
    name: string;
    description: string;
  }[]
> {
  return generators.map((generator) => ({
    name: generator.name,
    description: generator.data?.description ?? '',
  }));
}
