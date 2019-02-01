import { Inject } from '@nestjs/common';
import {
  CommandResponse,
  EditorSupport,
  Extension,
  InstallNodeJsStatus,
  IsNodeInstalledResult,
  SchematicCollectionForNgNew,
  Settings,
  Workspace
} from '../generated/graphql-types';
import { schematicCollectionsForNgNew } from '../api/read-ngnews';
import {
  cacheFiles,
  exists,
  files,
  filterByName,
  readJsonFile
} from '../utils/utils';
import { readDependencies } from '../api/read-dependencies';
import { availableExtensions, readExtensions } from '../api/read-extensions';
import { readProjects } from '../api/read-projects';
import { readNpmScripts } from '../api/read-npm-scripts';
import { readEditors } from '../api/read-editors';
import { nodeDownloadProgress, nodeInstallDone } from '../api/install-nodejs';
import { commands } from '../api/run-command';
import { Args, Context, Query, Resolver } from '@nestjs/graphql';
import { CommandInformation } from '../api/commands';
import { readSettings } from '../api/read-settings';

@Resolver()
export class QueryResolver {
  constructor(@Inject('store') private readonly store: any) {}

  @Query()
  settings(): Settings {
    return readSettings(this.store);
  }

  @Query()
  schematicCollections(): SchematicCollectionForNgNew[] {
    try {
      return schematicCollectionsForNgNew();
    } catch (e) {
      console.log(e);
      throw new Error(
        `Error when reading the collection list. Message: "${e.message}"`
      );
    }
  }

  @Query()
  workspace(@Args('path') p: string, @Context() context: any): Workspace {
    try {
      if (!files[p]) {
        cacheFiles(p);
      }
      const packageJson = readJsonFile('./package.json', p).json;
      const angularJson = readJsonFile('./angular.json', p).json;
      context.path = p;
      context.packageJson = packageJson;
      context.angularJson = angularJson;

      return {
        name: packageJson.name,
        path: p,
        dependencies: readDependencies(packageJson),
        extensions: readExtensions(packageJson),
        projects: readProjects(angularJson.projects),
        npmScripts: readNpmScripts(p, packageJson),
        docs: {} as any,
        schematicCollections: [] as any
      };
    } catch (e) {
      console.log(e);
      throw new Error(
        `Error when reading the workspace data. Message: "${e.message}"`
      );
    }
  }

  @Query()
  editors(): EditorSupport[] {
    return readEditors();
  }

  @Query()
  availableExtensions(@Args('name') name: string): Extension[] {
    try {
      return filterByName(availableExtensions(), { name });
    } catch (e) {
      console.log(e);
      throw new Error(
        `Error when reading the list of extensions. Message: "${e.message}"`
      );
    }
  }

  @Query()
  installNodeJsStatus(): InstallNodeJsStatus {
    try {
      if (readSettings(this.store).installNodeManually || exists('node')) {
        return { success: true };
      }
      if (nodeInstallDone) {
        return { cancelled: true };
      } else if (nodeDownloadProgress) {
        const { percentage, speed } = nodeDownloadProgress.progress();
        return {
          downloadPercentage: percentage,
          downloadSpeed: speed
        };
      } else {
        return {};
      }
    } catch (e) {
      console.log(e);
      throw new Error(
        `Error when reading the command status. Message: "${e.message}"`
      );
    }
  }

  @Query()
  isNodejsInstalled(): IsNodeInstalledResult {
    return {
      result: readSettings(this.store).installNodeManually || exists('node')
    };
  }

  @Query()
  commands(
    @Args('id') id: string,
    @Args('cols') cols: number
  ): CommandResponse[] {
    try {
      const settings = readSettings(this.store);
      const includeDetailedStatus = settings.enableDetailedStatus || false;
      if (id) {
        const c = commands.findMatchingCommand(id, commands.history);
        if (!c) return [];
        const r = serializeCommand(c, cols || 80, includeDetailedStatus);
        c.outChunk = '';
        return [r];
      } else {
        return commands.recent.map(c =>
          serializeCommand(c, cols || 80, includeDetailedStatus)
        );
      }
    } catch (e) {
      console.log(e);
      throw new Error(`Error when reading commands. Message: "${e.message}"`);
    }
  }
}

function serializeCommand(
  c: CommandInformation,
  cols: number,
  includeDetailedStatus: boolean
) {
  if (c.commandRunning) {
    c.commandRunning.setCols(cols);
  }
  return {
    id: c.id,
    type: c.id,
    workspace: c.workspace,
    command: c.command,
    status: c.status,
    out: c.out,
    outChunk: c.outChunk,
    detailedStatus:
      includeDetailedStatus && c.detailedStatusCalculator.detailedStatus
        ? JSON.stringify(c.detailedStatusCalculator.detailedStatus)
        : null
  };
}
