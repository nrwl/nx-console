import { matchWithWildcards } from '@nx-console/shared/utils';
import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import { getGenerators } from '@nx-console/vscode/nx-workspace';
import { window } from 'vscode';

export async function selectReMoveGenerator(
  path: string | undefined,
  target: 'move' | 'remove'
): Promise<string | undefined> {
  const generators = await getGenerators();

  if (!generators || !generators.length) {
    window.showWarningMessage(
      `No generators found in your workspace. Did you run npm/pnpm/yarn install?`
    );
    return;
  }

  const reMoveGenerators = generators.filter(
    (generator) => generator.data?.name === target
  );

  if (!reMoveGenerators.length) {
    window.showWarningMessage(
      `No ${target} generator found. Did you run npm/pnpm/yarn install?`
    );
    return;
  }

  if (reMoveGenerators.length === 1) {
    return reMoveGenerators[0].name;
  }

  const patterns =
    GlobalConfigurationStore.instance.get('moveGeneratorPatterns') ?? {};
  let matchedCollection: string | undefined;
  for (const [pattern, collection] of Object.entries(patterns)) {
    if (path && matchWithWildcards(path, pattern, false)) {
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

  const selectedGenerator = (
    await window.showQuickPick(quickPickItems, {
      title: `Select ${target} generator`,
      placeHolder: `@nx/workspace:${target}`,
      canPickMany: false,
    })
  )?.generator;

  return selectedGenerator;
}
