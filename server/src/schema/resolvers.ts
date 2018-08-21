import * as path from 'path';
import {
  directoryExists,
  filterByName,
  findClosestNg,
  findExecutable,
  readJsonFile
} from '../utils';
import {
  completeFiles,
  completeLocalModules,
  completeAbsoluteModules,
  completeProjects
} from '../api/completions';

import { readSchematicCollections } from '../api/read-schematic-collections';
import {
  readDescription,
  readProjects,
  readSchema
} from '../api/read-projects';
import { availableExtensions, readExtensions } from '../api/read-extensions';
import { readDependencies } from '../api/read-dependencies';
import { schematicCollectionsForNgNew } from '../api/read-ngnews';
import { openInEditor, readEditors } from '../api/read-editors';
import { readNpmScripts, readNpmScriptSchema } from '../api/read-npm-scripts';
import { readDirectory } from '../api/read-directory';
import {
  listFiles,
  files,
  commandInProgress,
  runCommand,
  stopAllCommands
} from '../api/commands';

const SchematicCollection = {
  schematics(collection: any, args: any) {
    return filterByName(collection.schematics, args);
  }
};

const Architect = {
  description(a, _, __, i) {
    if (!directoryExists(path.join(i.variableValues.path, 'node_modules'))) {
      throw new Error(`node_modules is not found`);
    }
    return readDescription(i.variableValues.path, a.builder);
  },
  schema(a, _, __, i) {
    if (!directoryExists(path.join(i.variableValues.path, 'node_modules'))) {
      throw new Error(`node_modules is not found`);
    }
    return readSchema(i.variableValues.path, a.builder);
  }
};

const Project = {
  architect(project: any, args: any) {
    return filterByName(project.architect, args);
  }
};

const NpmScript = {
  schema(a, _, __, i) {
    if (!directoryExists(path.join(i.variableValues.path, 'node_modules'))) {
      throw new Error(`node_modules is not found`);
    }
    return readNpmScriptSchema(i.variableValues.path, a.name);
  }
};

const Workspace = {
  schematicCollections(workspace: any, args: any, _: any, i: any) {
    const p = i.variableValues.path;
    if (!directoryExists(path.join(p, 'node_modules'))) {
      throw new Error(`node_modules is not found`);
    }

    const angularJson = readJsonFile('./angular.json', p).json;
    const collectionName =
      angularJson.cli && angularJson.cli.defaultCollection
        ? angularJson.cli.defaultCollection
        : '@schematics/angular';

    return filterByName(readSchematicCollections(p, collectionName), args);
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

const CompletionsTypes = {
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

const Database = {
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
  workspace(_root, args: any) {
    try {
      if (!files[args.path]) {
        listFiles(args.path);
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
      const v = await readDirectory(
        args.path,
        args.onlyDirectories,
        args.showHidden
      ).toPromise();
      if (!v) {
        return { path: args.path, files: [] };
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

const Mutation = {
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
