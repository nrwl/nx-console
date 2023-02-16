import { matchWithWildcards } from '@nx-console/shared/utils';
import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import { getGenerators } from '@nx-console/vscode/nx-workspace';
import { window } from 'vscode';

export async function selectReMoveGenerator(
  path: string,
  target: 'move' | 'remove'
): Promise<string | undefined> {
  const generators = await getGenerators();

  const reMoveGenerators = generators.filter(
    (generator) => generator.data?.name === target
  );

  if (reMoveGenerators.length === 1) {
    return reMoveGenerators[0].name;
  }

  const patterns =
    GlobalConfigurationStore.instance.get('moveGeneratorPatterns') ?? {};
  let matchedCollection: string | undefined;
  for (const [pattern, collection] of Object.entries(patterns)) {
    if (matchWithWildcards(path, pattern, false)) {
      matchedCollection = collection;
    }
  }

  if (matchedCollection) {
    return `${matchedCollection}:${target}`;
  }

  const quickPickItems = reMoveGenerators.map((generator) => ({
    description: generator.data?.description,
    label: `${generator.data?.collection} - ${generator.data?.name}`,
    generator: generator.name,
  }));

  const selectedGenerator = (await window.showQuickPick(quickPickItems))
    ?.generator;

  return selectedGenerator;
}
