import { readJsonFile } from '@nx-console/shared-file-system';
import { Option } from '@nx-console/shared-schema';
import { normalizeSchema } from '@nx-console/shared-schema';
import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import { lspLogger } from '@nx-console/language-server-utils';

export async function getGeneratorOptions(
  workspacePath: string,
  collectionName: string,
  generatorName: string,
  generatorPath: string,
): Promise<Option[]> {
  const generatorSchema = await readJsonFile(
    generatorPath,
    undefined,
    lspLogger,
  );
  const workspaceDefaults = await readWorkspaceJsonDefaults(workspacePath);
  const defaults =
    workspaceDefaults &&
    workspaceDefaults[collectionName] &&
    workspaceDefaults[collectionName][generatorName];

  return await normalizeSchema(generatorSchema.json, defaults);
}

async function readWorkspaceJsonDefaults(workspacePath: string): Promise<any> {
  const { nxJson } = await nxWorkspace(workspacePath, lspLogger);

  let defaults = nxJson.generators;

  if (!defaults) {
    try {
      /**
       * This could potentially fail if we're in an Angular CLI project without schematics being part of angular.json
       * Default the default to {} on the catch
       */
      defaults = nxJson.generators || {};
    } catch (e) {
      defaults = {};
    }
  }

  const collectionDefaults = Object.keys(defaults).reduce(
    (collectionDefaultsMap: any, key) => {
      if (key.includes(':')) {
        const [collectionName, generatorName] = key.split(':');
        if (!collectionDefaultsMap[collectionName]) {
          collectionDefaultsMap[collectionName] = {};
        }
        collectionDefaultsMap[collectionName][generatorName] = defaults?.[key];
      } else {
        const collectionName = key;
        if (!collectionDefaultsMap[collectionName]) {
          collectionDefaultsMap[collectionName] = {};
        }
        Object.keys(defaults?.[collectionName] ?? {}).forEach(
          (generatorName) => {
            collectionDefaultsMap[collectionName][generatorName] =
              defaults?.[collectionName][generatorName];
          },
        );
      }
      return collectionDefaultsMap;
    },
    {},
  );
  return collectionDefaults;
}
