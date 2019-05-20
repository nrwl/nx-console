import { Inject } from '@nestjs/common';
import {
  CommandResponse,
  EditorSupport,
  Extension,
  IsNodeInstalledResult,
  SchematicCollectionForNgNew,
  Settings,
  Workspace
} from '@angular-console/schema';
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
      console.error(e);
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
        projects: readProjects(angularJson.projects, p, this.store),
        npmScripts: readNpmScripts(p, packageJson),
        docs: {} as any,
        schematicCollections: [] as any
      };
    } catch (e) {
      console.error(e);
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
      console.error(e);
      throw new Error(
        `Error when reading the list of extensions. Message: "${e.message}"`
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
        const r = serializeIndividualCommand(
          c,
          cols || 80,
          includeDetailedStatus
        );
        c.outChunk = '';
        return [r as any];
      } else {
        return commands.recent.map(serializeCommandInList);
      }
    } catch (e) {
      console.error(e);
      throw new Error(`Error when reading commands. Message: "${e.message}"`);
    }
  }
}

function serializeIndividualCommand(
  c: CommandInformation,
  cols: number,
  includeDetailedStatus: boolean
) {
  if (c.commandRunning) {
    c.commandRunning.setCols(cols);
  }
  return {
    id: c.id,
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

function serializeCommandInList(c: CommandInformation): any {
  return {
    id: c.id,
    workspace: c.workspace,
    command: c.command,
    status: c.status
  };
}
