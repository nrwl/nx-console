import {
  NxGeneratorOptionsRequest,
  NxGeneratorOptionsRequestOptions,
} from '@nx-console/language-server/types';
import { readAndCacheJsonFile } from '@nx-console/shared/file-system';
import { Option } from '@nx-console/shared/schema';
import { normalizeSchema } from '@nx-console/shared/schema/normalize';
import { sendRequest } from '@nx-console/vscode/lsp-client';
import { getNxWorkspace } from './get-nx-workspace';

export function getGeneratorOptions(
  options: NxGeneratorOptionsRequestOptions & {
    workspaceType?: 'nx' | 'ng';
  }
): Promise<Option[]> {
  // the LSP doesn't know handle ng workspaces because we want to get rid of it
  // so we need to handle it here in that case
  if (options.workspaceType === 'ng') {
    return getGeneratorOptionsNg(
      options.collection,
      options.name,
      options.path,
      options.workspaceType
    );
  }
  return sendRequest(NxGeneratorOptionsRequest, { options });
}

// TODO: remove this once we get rid of ng compatibility
async function getGeneratorOptionsNg(
  collectionName: string,
  generatorName: string,
  generatorPath: string,
  workspaceType: 'ng'
): Promise<Option[]> {
  const generatorSchema = await readAndCacheJsonFile(generatorPath);
  const workspaceDefaults = await readWorkspaceJsonDefaults();
  const defaults =
    workspaceDefaults &&
    workspaceDefaults[collectionName] &&
    workspaceDefaults[collectionName][generatorName];
  return await normalizeSchema(generatorSchema.json, workspaceType, defaults);
}

async function readWorkspaceJsonDefaults(): Promise<any> {
  const { workspace } = await getNxWorkspace();

  let defaults = workspace.generators;

  if (!defaults) {
    try {
      /**
       * This could potentially fail if we're in an Angular CLI project without schematics being part of angular.json
       * Default the default to {} on the catch
       */
      defaults = workspace.generators || {};
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
          }
        );
      }
      return collectionDefaultsMap;
    },
    {}
  );
  return collectionDefaults;
}
