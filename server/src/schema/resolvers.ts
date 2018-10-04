import { mutations, queries } from '@nrwl/angular-console-enterprise-electron';
import * as path from 'path';

import {
  commandInProgress,
  runCommand,
  stopAllCommands
} from '../api/commands';
import {
  completeAbsoluteModules,
  completeFiles,
  completeLocalModules,
  completeProjects
} from '../api/completions';
import {
  installNodeJs,
  nodeDownloadProgress,
  nodeInstallDone
} from '../api/install-nodejs';
import { readDependencies } from '../api/read-dependencies';
import { readDirectory } from '../api/read-directory';
import { openInEditor, readEditors } from '../api/read-editors';
import { availableExtensions, readExtensions } from '../api/read-extensions';
import { schematicCollectionsForNgNew } from '../api/read-ngnews';
import { readNpmScripts, readNpmScriptSchema } from '../api/read-npm-scripts';
import { readProjects, readSchema } from '../api/read-projects';
import { readAllSchematicCollections } from '../api/read-schematic-collections';
import { readSettings, storeSettings } from '../api/read-settings';
import {
  ArchitectResolvers,
  CompletionsTypesResolvers,
  DatabaseResolvers,
  InstallNodeJsStatus,
  MutationResolvers,
  NpmScriptResolvers,
  ProjectResolvers,
  SchematicCollectionResolvers,
  WorkspaceResolvers
} from '../graphql-types';
import {
  cacheFiles,
  directoryExists,
  exists,
  files,
  filterByName,
  findClosestNg,
  findExecutable,
  readJsonFile
} from '../utils';

const SchematicCollection: SchematicCollectionResolvers.Resolvers = {
  schematics(collection: any, args: any) {
    return filterByName(collection.schematics, args);
  }
};

const Architect: ArchitectResolvers.Resolvers = {
  schema(a, _, __, i) {
    if (!directoryExists(path.join(i.variableValues.path, 'node_modules'))) {
      throw new Error(`node_modules is not found`);
    }
    return readSchema(i.variableValues.path, a.builder);
  }
};

const Project: ProjectResolvers.Resolvers = {
  architect(project: any, args: any) {
    return filterByName(project.architect, args);
  }
};

const NpmScript: NpmScriptResolvers.Resolvers = {
  schema(a, _, __, i) {
    if (!directoryExists(path.join(i.variableValues.path, 'node_modules'))) {
      throw new Error(`node_modules is not found`);
    }
    return readNpmScriptSchema(i.variableValues.path, a.name);
  }
};

const Workspace: WorkspaceResolvers.Resolvers = {
  schematicCollections(workspace: any, args: any, _: any, i: any) {
    const p = i.variableValues.path;
    if (!directoryExists(path.join(p, 'node_modules'))) {
      throw new Error(`node_modules is not found`);
    }
    return filterByName(readAllSchematicCollections(p), args);
  },
  npmScripts(workspace: any, args: any) {
    return filterByName(workspace.npmScripts, args);
  },
  projects(workspace: any, args: any) {
    return filterByName(workspace.projects, args);
  },
  completions(workspace: any) {
    return workspace;
  }
};

const CompletionsTypes: CompletionsTypesResolvers.Resolvers = {
  files(workspace: any, args: any) {
    return completeFiles(files, workspace, args.input);
  },
  projects(workspace: any, args: any) {
    return completeProjects(workspace, args.input);
  },
  localModules(workspace: any, args: any) {
    return completeLocalModules(files, workspace, args.input);
  },
  absoluteModules(workspace: any, args: any) {
    return completeAbsoluteModules(files, workspace, args.input);
  }
};

const Database: DatabaseResolvers.Resolvers = {
  isNodejsInstalled() {
    return {
      result: exists('node')
    };
  },
  settings() {
    return readSettings();
  },
  schematicCollections() {
    try {
      return schematicCollectionsForNgNew();
    } catch (e) {
      console.log(e);
      throw new Error(
        `Error when reading the collection list. Message: "${e.message}"`
      );
    }
  },
  async workspace(_root, args: any) {
    try {
      if (!files[args.path]) {
        cacheFiles(args.path);
      }
      const packageJson = readJsonFile('./package.json', args.path).json;
      const angularJson = readJsonFile('./angular.json', args.path).json;

      return {
        name: packageJson.name,
        path: args.path,
        dependencies: readDependencies(packageJson),
        extensions: readExtensions(packageJson),
        projects: readProjects(args.path, angularJson.projects),
        npmScripts: readNpmScripts(args.path, packageJson)
      };
    } catch (e) {
      console.log(e);
      throw new Error(
        `Error when reading the workspace data. Message: "${e.message}"`
      );
    }
  },
  editors() {
    return readEditors();
  },
  availableExtensions(_: any, args: any) {
    try {
      return filterByName(availableExtensions(), args);
    } catch (e) {
      console.log(e);
      throw new Error(
        `Error when reading the list of extensions. Message: "${e.message}"`
      );
    }
  },
  installNodeJsStatus(_root: any, args: any): InstallNodeJsStatus {
    try {
      if (exists('node')) {
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
  },
  commandStatus(_root: any, args: any) {
    try {
      if (commandInProgress) {
        const r = {
          command: commandInProgress.command,
          status: commandInProgress.status,
          out: commandInProgress.out
        };
        commandInProgress.out = '';
        return r;
      } else {
        return { command: null, status: 'terminated', out: '' };
      }
    } catch (e) {
      console.log(e);
      throw new Error(
        `Error when reading the command status. Message: "${e.message}"`
      );
    }
  },
  async directory(_: any, args: any) {
    try {
      // XXX: any? Because TS throws an error that string doesn't match Enum
      const v: any = await readDirectory(
        args.path,
        args.onlyDirectories,
        args.showHidden
      ).toPromise();
      if (!v) {
        return { path: args.path, exists: false, files: [] };
      }
      return v;
    } catch (e) {
      console.log(e);
      throw new Error(
        `Error when reading the directory "${args.path}". Message: "${
          e.message
        }"`
      );
    }
  },
  ...(queries as any)
};

const Mutation: MutationResolvers.Resolvers = {
  async ngAdd(_root: any, args: any) {
    try {
      return runCommand(args.path, findClosestNg(args.path), [
        'add',
        args.name
      ]);
    } catch (e) {
      console.log(e);
      throw new Error(`Error when running 'ng add'. Message: "${e.message}"`);
    }
  },
  async ngNew(_root: any, args: any) {
    try {
      return runCommand(args.path, findClosestNg(__dirname), [
        'new',
        args.name,
        `--directory=${args.name}`,
        `--collection=${args.collection}`
      ]);
    } catch (e) {
      console.log(e);
      throw new Error(`Error when running 'ng new'. Message: "${e.message}"`);
    }
  },
  async generate(_root: any, args: any) {
    try {
      const dryRun = args.dryRun ? ['--dry-run'] : [];
      return runCommand(args.path, findClosestNg(args.path), [
        'generate',
        ...args.genCommand,
        ...dryRun
      ]);
    } catch (e) {
      console.log(e);
      throw new Error(
        `Error when running 'ng generate'. Message: "${e.message}"`
      );
    }
  },
  async runNg(_root: any, args: any) {
    try {
      return runCommand(args.path, findClosestNg(args.path), args.runCommand);
    } catch (e) {
      console.log(e);
      throw new Error(`Error when running 'ng ...'. Message: "${e.message}"`);
    }
  },
  async runNpm(_root: any, args: any) {
    try {
      return runCommand(
        args.path,
        findExecutable(args.npmClient, args.path),
        args.runCommand
      );
    } catch (e) {
      console.log(e);
      throw new Error(`Error when running npm script. Message:"${e.message}"`);
    }
  },
  async installNodeJs() {
    return installNodeJs();
  },
  async stop() {
    try {
      stopAllCommands();
      return { result: true };
    } catch (e) {
      console.log(e);
      throw new Error(`Error when stopping commands. Message: "${e.message}"`);
    }
  },
  openInEditor(_root: any, args: any) {
    try {
      openInEditor(args.editor, args.path);
      return { response: 'Success' };
    } catch (e) {
      console.log(e);
      throw new Error(`Error when opening an editor. Message: "${e.message}"`);
    }
  },
  updateSettings(_root: any, args: any) {
    storeSettings(JSON.parse(args.data));
    return readSettings();
  },
  ...mutations
};

export const resolvers = {
  SchematicCollection,
  Architect,
  Project,
  NpmScript,
  Workspace,
  CompletionsTypes,
  Database,
  Mutation
};
