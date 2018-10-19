import * as path from 'path';
import { shell, dialog } from 'electron';

import { commands, runCommand } from '../api/run-command';
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
import { readNpmScripts, readNpmScriptSchema } from '../api/read-npm-scripts';
import { schematicCollectionsForNgNew } from '../api/read-ngnews';
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
  filterById,
  filterByName,
  findClosestNg,
  findExecutable,
  readJsonFile
} from '../utils';
import { mainWindow } from '..';

const SchematicCollection: SchematicCollectionResolvers.Resolvers = {
  schematics(collection: any, args: any) {
    return filterByName(collection.schematics, args);
  }
};

const Architect: ArchitectResolvers.Resolvers = {
  schema(a: any, _: any, context: any) {
    if (!directoryExists(path.join(context.path, 'node_modules'))) {
      throw new Error(`node_modules is not found`);
    }
    return readSchema(context.path, a.builder);
  }
};

const Project: ProjectResolvers.Resolvers = {
  architect(project: any, args: any) {
    return filterByName(project.architect, args);
  }
};

const NpmScript: NpmScriptResolvers.Resolvers = {
  schema(a: any, _: any, context: any) {
    if (!directoryExists(path.join(context.path, 'node_modules'))) {
      throw new Error(`node_modules is not found`);
    }
    return readNpmScriptSchema(context.path, a.name);
  }
};

const Workspace: WorkspaceResolvers.Resolvers = {
  schematicCollections(workspace: any, args: any, context: any) {
    if (!directoryExists(path.join(context.path, 'node_modules'))) {
      throw new Error(`node_modules is not found`);
    }
    return filterByName(readAllSchematicCollections(context.path), args);
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
      result: readSettings().installNodeManually || exists('node')
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
  async workspace(_root: any, args: any, context: any) {
    try {
      if (!files[args.path]) {
        cacheFiles(args.path);
      }
      context.path = args.path;
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
      if (readSettings().installNodeManually || exists('node')) {
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
  commands(_root: any, args: any) {
    try {
      return filterById(
        commands.recent.map(c => {
          const r = {
            id: c.id,
            type: c.id,
            workspace: c.workspace,
            command: c.command,
            status: c.status,
            out: c.out,
            outChunk: c.outChunk,
            detailedStatus: c.detailedStatusCalculator.detailedStatus
              ? JSON.stringify(c.detailedStatusCalculator.detailedStatus)
              : null
          };
          c.outChunk = '';
          return r;
        }),
        args
      );
    } catch (e) {
      console.log(e);
      throw new Error(`Error when reading commands. Message: "${e.message}"`);
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
  }
};

const Mutation: MutationResolvers.Resolvers = {
  async ngAdd(_root: any, args: any) {
    try {
      return runCommand('add', args.path, 'ng', findClosestNg(args.path), [
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
      return runCommand('new', args.path, 'ng', findClosestNg(__dirname), [
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
      return runCommand('generate', args.path, 'ng', findClosestNg(args.path), [
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
      return runCommand(
        'ng',
        args.path,
        'ng',
        findClosestNg(args.path),
        args.runCommand
      );
    } catch (e) {
      console.log(e);
      throw new Error(`Error when running 'ng ...'. Message: "${e.message}"`);
    }
  },
  async runNpm(_root: any, args: any) {
    try {
      return runCommand(
        'npm',
        args.path,
        args.npmClient,
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
  async stopCommand(_root: any, args: any) {
    try {
      commands.stopCommands([
        commands.findMatchingCommand(args.id, commands.recent)
      ]);
      return { result: true };
    } catch (e) {
      console.log(e);
      throw new Error(`Error when stopping commands. Message: "${e.message}"`);
    }
  },
  async openInBrowser(_root: any, { url }: any) {
    if (url) {
      shell.openExternal(url);
      return { result: true };
    } else {
      return { result: false };
    }
  },
  async showItemInFolder(_root: any, { item }: any) {
    if (item) {
      return { result: shell.showItemInFolder(item) };
    } else {
      return { result: false };
    }
  },
  async removeCommand(_root: any, args: any) {
    try {
      commands.removeCommand(args.id);
      return { result: true };
    } catch (e) {
      console.log(e);
      throw new Error(`Error when removing commands. Message: "${e.message}"`);
    }
  },
  async removeAllCommands(_root: any, args: any) {
    try {
      commands.removeAllCommands();
      return { result: true };
    } catch (e) {
      console.log(e);
      throw new Error(`Error when removing commands. Message: "${e.message}"`);
    }
  },
  async restartCommand(_root: any, args: any) {
    try {
      commands.restartCommand(args.id);
      return { result: true };
    } catch (e) {
      console.log(e);
      throw new Error(
        `Error when restarting commands. Message: "${e.message}"`
      );
    }
  },
  openInEditor(_root: any, args: any) {
    try {
      openInEditor(args.editor, args.path);
      return { response: 'successful' };
    } catch (e) {
      console.log(e);
      throw new Error(`Error when opening an editor. Message: "${e.message}"`);
    }
  },
  selectDirectory(root: any, args: any) {
    const directoryPath = dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      buttonLabel: args.dialogButtonLabel,
      title: args.dialogTitle
    });

    return {
      selectedDirectoryPath: directoryPath ? directoryPath[0] : null
    };
  },
  updateSettings(_root: any, args: any) {
    storeSettings(JSON.parse(args.data));
    return readSettings();
  }
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
