import * as path from 'path';
import * as semver from 'semver';

import {
  completeAbsoluteModules,
  completeFiles,
  completeLocalModules,
  completeProjects
} from './api/completions';
import { docs } from './api/docs';
import {
  installNodeJs,
  nodeDownloadProgress,
  nodeInstallDone
} from './api/install-nodejs';
import { readDependencies } from './api/read-dependencies';
import { Editor, openInEditor, readEditors } from './api/read-editors';
import { availableExtensions, readExtensions } from './api/read-extensions';
import { schematicCollectionsForNgNew } from './api/read-ngnews';
import { readNpmScripts, readNpmScriptSchema } from './api/read-npm-scripts';
import { readProjects, readSchema } from './api/read-projects';
import { readAllSchematicCollections } from './api/read-schematic-collections';
import { readSettings, storeSettings } from './api/read-settings';
import { commands, PseudoTerminalFactory, runCommand } from './api/run-command';
import {
  ArchitectResolvers,
  CompletionsTypesResolvers,
  DatabaseResolvers,
  DocsResolvers,
  InstallNodeJsStatus,
  MutationResolvers,
  NpmScriptResolvers,
  ProjectResolvers,
  SchematicCollectionResolvers,
  WorkspaceResolvers
} from './generated/graphql-types';
import {
  cacheFiles,
  directoryExists,
  exists,
  files,
  filterByName,
  findClosestNg,
  findExecutable,
  readJsonFile
} from './utils';
import { CommandInformation } from './api/commands';

export type SelectDirectory = (
  options: { title: string; buttonLabel: string }
) => Promise<string | undefined>;

export const getResolvers = (
  selectDirectory: SelectDirectory,
  store: any,
  serverAddress: string,
  psedoTerminalFactory: PseudoTerminalFactory
) => {
  const SchematicCollection: SchematicCollectionResolvers.Resolvers = {
    schematics(collection, args) {
      return filterByName(collection.schematics, args);
    }
  };

  const Architect: ArchitectResolvers.Resolvers = {
    schema(a, _, context) {
      if (!directoryExists(path.join(context.path, 'node_modules'))) {
        throw new Error(`node_modules is not found`);
      }
      return readSchema(context.path, a.builder);
    }
  };

  const Project: ProjectResolvers.Resolvers = {
    architect(project, args) {
      return filterByName(project.architect, args);
    }
  };

  const NpmScript: NpmScriptResolvers.Resolvers = {
    schema(a, _, context) {
      if (!directoryExists(path.join(context.path, 'node_modules'))) {
        throw new Error(`node_modules is not found`);
      }
      return readNpmScriptSchema(context.path, a.name);
    }
  };

  const Workspace: WorkspaceResolvers.Resolvers = {
    schematicCollections(_, args, context) {
      const settings = readSettings(store);
      if (!directoryExists(path.join(context.path, 'node_modules'))) {
        throw new Error(`node_modules is not found`);
      }
      return filterByName(
        readAllSchematicCollections(
          context.path,
          settings.workspaceSchematicsDirectory,
          settings.workspaceSchematicsNpmScript
        ),
        args
      );
    },
    npmScripts(workspace, args) {
      return filterByName(workspace.npmScripts, args);
    },
    projects(workspace, args) {
      return filterByName(workspace.projects, args);
    },
    completions(workspace) {
      return workspace;
    },
    docs(workspace) {
      return workspace;
    }
  };

  const CompletionsTypes: CompletionsTypesResolvers.Resolvers = {
    files(workspace, args) {
      return completeFiles(files, workspace, args.input);
    },
    projects(workspace, args) {
      return completeProjects(workspace, args.input);
    },
    localModules(workspace, args) {
      return completeLocalModules(files, workspace, args.input);
    },
    absoluteModules(workspace, args) {
      return completeAbsoluteModules(files, workspace, args.input);
    }
  };

  const Docs: DocsResolvers.Resolvers = {
    workspaceDocs(workspace, args, context) {
      const deps = {
        ...context.packageJson.dependencies,
        ...context.packageJson.devDependencies
      };
      return docs.workspaceDocs(deps).toPromise();
    },

    schematicDocs(workspace, args, context) {
      // TODO: vsavkin read the version from node_modules and provide here instead of null
      return docs
        .schematicDocs(args.collectionName, null, args.name)
        .toPromise();
    }
  };

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

  const Database: DatabaseResolvers.Resolvers = {
    isNodejsInstalled() {
      return {
        result: readSettings(store).installNodeManually || exists('node')
      };
    },
    settings() {
      return readSettings(store);
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
    async workspace(_root, args, context) {
      try {
        if (!files[args.path]) {
          cacheFiles(args.path);
        }
        const packageJson = readJsonFile('./package.json', args.path).json;
        const angularJson = readJsonFile('./angular.json', args.path).json;
        context.path = args.path;
        context.packageJson = packageJson;
        context.angularJson = angularJson;

        return {
          name: packageJson.name,
          path: args.path,
          dependencies: readDependencies(packageJson),
          extensions: readExtensions(packageJson),
          projects: readProjects(args.path, angularJson.projects),
          npmScripts: readNpmScripts(args.path, packageJson),
          docs: {} as any
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
    availableExtensions(_, args) {
      try {
        return filterByName(availableExtensions(), args);
      } catch (e) {
        console.log(e);
        throw new Error(
          `Error when reading the list of extensions. Message: "${e.message}"`
        );
      }
    },
    installNodeJsStatus(_root, args): InstallNodeJsStatus {
      try {
        if (readSettings(store).installNodeManually || exists('node')) {
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
    commands(_root, args) {
      try {
        const settings = readSettings(store);
        const includeDetailedStatus = settings.enableDetailedStatus || false;
        if (args.id) {
          const c = commands.findMatchingCommand(args.id, commands.history);
          if (!c) return [];
          const r = serializeCommand(c, args.cols || 80, includeDetailedStatus);
          c.outChunk = '';
          return [r];
        } else {
          return commands.recent.map(c =>
            serializeCommand(c, args.cols || 80, includeDetailedStatus)
          );
        }
      } catch (e) {
        console.log(e);
        throw new Error(`Error when reading commands. Message: "${e.message}"`);
      }
    }
  };

  const Mutation: MutationResolvers.Resolvers = {
    async ngAdd(_root, args) {
      try {
        return runCommand(
          'add',
          args.path,
          'ng',
          findClosestNg(args.path),
          ['add', args.name, ...disableInteractivePrompts(args.path)],
          psedoTerminalFactory
        );
      } catch (e) {
        console.log(e);
        throw new Error(`Error when running 'ng add'. Message: "${e.message}"`);
      }
    },
    async ngNew(_root, args) {
      try {
        return runCommand(
          'new',
          args.path,
          'ng',
          findClosestNg(__dirname),
          [
            'new',
            args.name,
            `--directory=${args.name}`,
            `--collection=${args.collection}`,
            '--no-interactive'
          ],
          psedoTerminalFactory
        );
      } catch (e) {
        console.log(e);
        throw new Error(`Error when running 'ng new'. Message: "${e.message}"`);
      }
    },
    async generate(_root, args) {
      try {
        const dryRun = args.dryRun ? ['--dry-run'] : [];
        return runCommand(
          'generate',
          args.path,
          'ng',
          findClosestNg(args.path),
          [
            'generate',
            ...args.genCommand,
            ...dryRun,
            ...disableInteractivePrompts(args.path)
          ],
          psedoTerminalFactory,
          !args.dryRun
        );
      } catch (e) {
        console.log(e);
        throw new Error(
          `Error when running 'ng generate'. Message: "${e.message}"`
        );
      }
    },
    async generateUsingNpm(_root, args) {
      try {
        const dryRun = args.dryRun ? ['--dry-run'] : [];
        return runCommand(
          'npm',
          args.path,
          args.npmClient,
          findExecutable(args.npmClient, args.path),
          [
            ...args.genCommand,
            ...dryRun,
            ...disableInteractivePrompts(args.path)
          ],
          psedoTerminalFactory,
          !args.dryRun
        );
      } catch (e) {
        console.log(e);
        throw new Error(
          `Error when running npm script. Message: "${e.message}"`
        );
      }
    },
    async runNg(_root, args) {
      try {
        return runCommand(
          'ng',
          args.path,
          'ng',
          findClosestNg(args.path),
          args.runCommand,
          psedoTerminalFactory
        );
      } catch (e) {
        console.log(e);
        throw new Error(`Error when running 'ng ...'. Message: "${e.message}"`);
      }
    },
    async runNpm(_root, args) {
      try {
        return runCommand(
          'npm',
          args.path,
          args.npmClient,
          findExecutable(args.npmClient, args.path),
          args.runCommand,
          psedoTerminalFactory
        );
      } catch (e) {
        console.log(e);
        throw new Error(
          `Error when running npm script. Message:"${e.message}"`
        );
      }
    },
    async installNodeJs() {
      return installNodeJs();
    },
    async stopCommand(_root, args) {
      try {
        const c = commands.findMatchingCommand(args.id, commands.recent);
        if (c) {
          commands.stopCommands([c]);
          return { result: true };
        } else {
          return { result: false };
        }
      } catch (e) {
        console.log(e);
        throw new Error(
          `Error when stopping commands. Message: "${e.message}"`
        );
      }
    },
    async openInBrowser(_root, { url }) {
      if (url) {
        const opn = require('opn');

        opn(url);
        return { result: true };
      } else {
        return { result: false };
      }
    },
    async showItemInFolder(_root, { item }) {
      if (item) {
        const opn = require('opn');

        opn(item);
        return { result: true };
      } else {
        return { result: false };
      }
    },
    async removeCommand(_root, args) {
      try {
        commands.removeCommand(args.id);
        return { result: true };
      } catch (e) {
        console.log(e);
        throw new Error(
          `Error when removing commands. Message: "${e.message}"`
        );
      }
    },
    async removeAllCommands(_root) {
      try {
        commands.removeAllCommands();
        return { result: true };
      } catch (e) {
        console.log(e);
        throw new Error(
          `Error when removing commands. Message: "${e.message}"`
        );
      }
    },
    async restartCommand(_root, args) {
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
    openInEditor(_root, args) {
      try {
        openInEditor(args.editor as Editor, args.path, serverAddress);
        return { response: 'successful' };
      } catch (e) {
        console.log(e);
        throw new Error(
          `Error when opening an editor. Message: "${e.message}"`
        );
      }
    },
    async selectDirectory(_root, args) {
      // TODO(jack): This mocked value is needed because e2e tests that bring up the dialog will block entire electron main thread.
      if (process.env.CI === 'true') {
        return {
          selectedDirectoryPath: '/tmp'
        };
      } else {
        const directoryPath = await selectDirectory({
          buttonLabel: args.dialogButtonLabel,
          title: args.dialogTitle
        });

        return {
          selectedDirectoryPath: directoryPath || null
        };
      }
    },
    updateSettings(_root, args) {
      storeSettings(store, JSON.parse(args.data));
      return readSettings(store);
    },
    async openDoc(_root, args) {
      const result = await docs.openDoc(args.id).toPromise();
      return { result };
    }
  };

  function disableInteractivePrompts(p: string) {
    try {
      const version = readJsonFile(
        path.join(`@angular`, 'cli', 'package.json'),
        path.join(p, 'node_modules')
      ).json.version;
      return semver.gte(version, '7.0.0') ? ['--no-interactive'] : [];
    } catch (e) {
      console.log('cannot parse cli version', e.message);
      // don't recognize the version => assume it's greater than 7
      return ['--no-interactive'];
    }
  }

  return {
    SchematicCollection,
    Architect,
    Project,
    NpmScript,
    Workspace,
    CompletionsTypes,
    Docs,
    Database,
    Mutation
  };
};
