import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import {
  GeneratorCollectionInfo,
  GeneratorType,
} from '@nx-console/shared/schema';
import { matchWithWildcards } from '@nx-console/shared/utils';
import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import {
  getGeneratorOptions,
  getGenerators,
  getNxWorkspace,
} from '@nx-console/vscode/nx-workspace';
import { showNoGeneratorsMessage } from '@nx-console/vscode/utils';
import { QuickPickItem, window } from 'vscode';
import { selectFlags } from './select-flags';

export async function selectGeneratorAndPromptForFlags(
  preselectedGenerator?: string,
  preselectedFlags?: Record<string, string>
): Promise<
  | {
      generator: GeneratorSchema;
      flags: string[];
    }
  | undefined
> {
  const validWorkspaceJson = (await getNxWorkspace())?.validWorkspaceJson;

  if (!validWorkspaceJson) {
    return;
  }

  const selection: GeneratorSchema | undefined = await getOrSelectGenerator(
    preselectedGenerator
  );

  if (!selection) {
    return;
  }

  const flags = await selectFlags(
    `generate ${selection.collectionName}:${selection.generatorName}`,
    selection.options,
    preselectedFlags
  );

  if (!flags) {
    return;
  }

  return {
    generator: selection,
    flags,
  };
}

export async function getOrSelectGenerator(
  generatorName?: string
): Promise<GeneratorSchema | undefined> {
  if (generatorName) {
    const generatorInfo = {
      collection: generatorName.split(':')[0],
      name: generatorName.split(':')[1],
    };
    const foundGenerator = ((await getGenerators()) ?? []).find(
      (gen) =>
        generatorInfo.collection === gen.data?.collection &&
        generatorInfo.name === gen.data?.name
    );
    if (foundGenerator) {
      const options = await getGeneratorOptions({
        collection: generatorInfo.collection,
        name: generatorInfo.name,
        path: foundGenerator.schemaPath,
      });
      return {
        collectionName: foundGenerator.data?.collection ?? '',
        generatorName: foundGenerator.data?.name ?? '',
        description: foundGenerator.data?.description ?? '',
        options: options ?? [],
      };
    }
  }

  return await selectGenerator();
}

async function selectGenerator(): Promise<GeneratorSchema | undefined> {
  interface GenerateQuickPickItem extends QuickPickItem {
    generator: GeneratorCollectionInfo;
  }

  const generators = (await getGenerators()) ?? [];
  let generatorsQuickPicks = generators
    .filter((collection) => !!collection.data)
    .map((collection): GenerateQuickPickItem => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const generatorData = collection.data!;
      return {
        description: generatorData.description,
        label: `${generatorData.collection} - ${generatorData.name}`,
        generator: collection,
      };
    });

  if (GlobalConfigurationStore.instance.get('enableGeneratorFilters') ?? true) {
    const allowlist: string[] =
      GlobalConfigurationStore.instance.get('generatorAllowlist') ?? [];
    const blocklist: string[] =
      GlobalConfigurationStore.instance.get('generatorBlocklist') ?? [];

    if (allowlist.length > 0) {
      generatorsQuickPicks = generatorsQuickPicks.filter((item) =>
        allowlist.find((rule) =>
          matchWithWildcards(
            `${item.generator.data?.collection}:${item.generator.data?.name}`,
            rule
          )
        )
      );
    }

    if (blocklist.length > 0) {
      generatorsQuickPicks = generatorsQuickPicks.filter(
        (item) =>
          !blocklist.find((rule) =>
            matchWithWildcards(
              `${item.generator.data?.collection}:${item.generator.data?.name}`,
              rule
            )
          )
      );
    }
  }

  if (!generators || !generators.length) {
    showNoGeneratorsMessage();
    return;
  }
  const selection = await window.showQuickPick(generatorsQuickPicks, {
    placeHolder: 'Select a generator',
  });

  if (selection && selection.generator.data) {
    const options =
      (selection.generator.data?.options ||
        (await getGeneratorOptions({
          collection: selection.generator.data.collection,
          name: selection.generator.name,
          path: selection.generator.schemaPath,
        }))) ??
      [];
    return {
      generatorName: selection.generator.data.name,
      collectionName: selection.generator.data.collection,
      description: selection.generator.data.description,
      options,
    };
  }
  return;
}
