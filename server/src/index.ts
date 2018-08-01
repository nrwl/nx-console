import * as express from 'express';
import * as graphql from 'graphql';
import * as path from 'path';
import {
  directoryExists,
  filterByName,
  findClosestNg,
  findExecutable,
  listFilesRec,
  readJsonFile
} from './utils';
import { readSchematicCollections } from './read-schematic-collections';
import { readDescription, readProjects, readSchema } from './read-projects';
import { availableExtensions, readExtensions } from './read-extensions';
import { readDependencies } from './read-dependencies';
import { schematicCollectionsForNgNew } from './read-ngnews';
import { openInEditor, readEditors } from './read-editors';
import { readNpmScripts, readNpmScriptSchema } from './read-npm-scripts';
import { readDirectory } from './read-directory';
import {
  completeFiles,
  completeModules,
  completeProjects
} from './completions';
import * as os from 'os';
import { catchError } from 'rxjs/operators';

const dirSync = require('tmp').dirSync;
const spawn = require('node-pty-prebuilt').spawn;

const graphqlHTTP = require('express-graphql');

interface CommandResult {
  command: string;
  status: string;
  out: string;
  commandRunning: any;
}

let commandInProgress: CommandResult | null;
const files: { [path: string]: string[] } = {};

export const commandResultType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'CommandResult',
    fields: () => {
      return {
        command: {
          type: graphql.GraphQLString
        },
        status: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        out: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        }
      };
    }
  }
);

export const commandStartedType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'CommandStarted',
    fields: () => {
      return {
        command: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        }
      };
    }
  }
);

export const extensionType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'Extension',
    fields: () => {
      return {
        name: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        description: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        detailedDescription: {
          type: graphql.GraphQLString
        }
      };
    }
  }
);

export const schematicType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'Schematic',
    fields: () => {
      return {
        collection: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        name: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        description: {
          type: graphql.GraphQLString
        },
        schema: {
          type: new graphql.GraphQLList(
            new graphql.GraphQLObjectType({
              name: 'SchematicSchema',
              fields: () => {
                return {
                  name: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                  },
                  type: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                  },
                  description: {
                    type: graphql.GraphQLString
                  },
                  defaultValue: {
                    type: graphql.GraphQLString
                  },
                  required: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean)
                  },
                  positional: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean)
                  },
                  enum: {
                    type: new graphql.GraphQLList(graphql.GraphQLString)
                  }
                };
              }
            })
          )
        }
      };
    }
  }
);

export const schematicCollectionType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'SchematicCollection',
    fields: () => {
      return {
        name: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        schematics: {
          type: new graphql.GraphQLList(schematicType),
          args: {
            name: { type: graphql.GraphQLString }
          },
          resolve: (collection: any, args: any) => {
            return filterByName(collection.schematics, args);
          }
        }
      };
    }
  }
);

export const schemaType = new graphql.GraphQLList(
  new graphql.GraphQLObjectType({
    name: 'ArchitectSchema',
    fields: () => {
      return {
        name: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        type: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        description: {
          type: graphql.GraphQLString
        },
        defaultValue: {
          type: graphql.GraphQLString
        },
        required: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean)
        },
        positional: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean)
        },
        enum: {
          type: new graphql.GraphQLList(graphql.GraphQLString)
        }
      };
    }
  })
);

export const architectType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'Architect',
    fields: () => {
      return {
        name: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        project: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        builder: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        configurations: {
          type: new graphql.GraphQLList(
            new graphql.GraphQLObjectType({
              name: 'ArchitectConfigurations',
              fields: () => {
                return {
                  name: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                  }
                };
              }
            })
          )
        },
        description: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString),
          resolve: (a, _, __, i) => {
            if (
              !directoryExists(path.join(i.variableValues.path, 'node_modules'))
            ) {
              throw new Error(`node_modules is not found`);
            }
            return readDescription(i.variableValues.path, a.builder);
          }
        },
        schema: {
          type: schemaType,
          resolve: (a, _, __, i) => {
            if (
              !directoryExists(path.join(i.variableValues.path, 'node_modules'))
            ) {
              throw new Error(`node_modules is not found`);
            }
            return readSchema(i.variableValues.path, a.builder);
          }
        }
      };
    }
  }
);

export const projectType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'Project',
    fields: () => {
      return {
        name: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        root: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        projectType: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        architect: {
          type: new graphql.GraphQLList(architectType),
          args: {
            name: { type: graphql.GraphQLString }
          },
          resolve: (project: any, args: any) => {
            return filterByName(project.architect, args);
          }
        }
      };
    }
  }
);

export const npmScriptType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'NpmScript',
    fields: () => {
      return {
        name: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        npmClient: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        schema: {
          type: schemaType,
          resolve: (a, _, __, i) => {
            if (
              !directoryExists(path.join(i.variableValues.path, 'node_modules'))
            ) {
              throw new Error(`node_modules is not found`);
            }
            return readNpmScriptSchema(i.variableValues.path, a.name);
          }
        }
      };
    }
  }
);

export const workspaceType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'Workspace',
    fields: () => {
      return {
        name: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        path: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        dependencies: {
          type: new graphql.GraphQLList(
            new graphql.GraphQLObjectType({
              name: 'Dependencies',
              fields: () => {
                return {
                  name: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                  },
                  version: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                  }
                };
              }
            })
          )
        },
        extensions: {
          type: new graphql.GraphQLList(extensionType)
        },
        schematicCollections: {
          type: new graphql.GraphQLList(schematicCollectionType),
          args: {
            name: { type: graphql.GraphQLString }
          },
          resolve: (workspace: any, args: any, _: any, i: any) => {
            const p = i.variableValues.path;
            if (!directoryExists(path.join(p, 'node_modules'))) {
              throw new Error(`node_modules is not found`);
            }

            const angularJson = readJsonFile('./angular.json', p).json;
            const collectionName =
              angularJson.cli && angularJson.cli.defaultCollection
                ? angularJson.cli.defaultCollection
                : '@schematics/angular';

            return filterByName(
              readSchematicCollections(p, collectionName),
              args
            );
          }
        },
        npmScripts: {
          type: new graphql.GraphQLList(npmScriptType),
          args: {
            name: { type: graphql.GraphQLString }
          },
          resolve: (workspace: any, args: any) => {
            return filterByName(workspace.npmScripts, args);
          }
        },
        projects: {
          type: new graphql.GraphQLList(projectType),
          args: {
            name: { type: graphql.GraphQLString }
          },
          resolve: (workspace: any, args: any) => {
            return filterByName(workspace.projects, args);
          }
        },
        completions: {
          type: completionsType,
          resolve: (workspace: any) => workspace
        }
      };
    }
  }
);

export const schematicCollectionForNgNewType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'SchematicCollectionForNgNew',
    fields: () => {
      return {
        name: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        description: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        }
      };
    }
  }
);

export const editorSupportType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'EditorSupport',
    fields: () => {
      return {
        name: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        icon: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        }
      };
    }
  }
);

export const completionResultType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'CompletionResultType',
    fields: () => {
      return {
        value: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        display: {
          type: graphql.GraphQLString
        }
      };
    }
  }
);

export const completionsType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'CompletionsTypes',
    fields: () => {
      return {
        files: {
          type: new graphql.GraphQLList(completionResultType),
          args: {
            input: { type: graphql.GraphQLString }
          },
          resolve: (workspace: any, args: any) => {
            return completeFiles(files, workspace, args.input);
          }
        },
        projects: {
          type: new graphql.GraphQLList(completionResultType),
          args: {
            input: { type: graphql.GraphQLString }
          },
          resolve: (workspace: any, args: any) => {
            return completeProjects(workspace, args.input);
          }
        },
        modules: {
          type: new graphql.GraphQLList(completionResultType),
          args: {
            input: { type: graphql.GraphQLString }
          },
          resolve: (workspace: any, args: any) => {
            return completeModules(files, workspace, args.input);
          }
        }
      };
    }
  }
);

export const filesType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'FilesType',
    fields: () => {
      return {
        path: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString)
        },
        files: {
          type: new graphql.GraphQLList(
            new graphql.GraphQLObjectType({
              name: 'FileListType',
              fields: () => {
                return {
                  name: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                  },
                  type: {
                    type: new graphql.GraphQLNonNull(
                      new graphql.GraphQLEnumType({
                        name: 'FileType',
                        values: {
                          file: { value: 'file' },
                          directory: { value: 'directory' },
                          angularDirectory: { value: 'angularDirectory' }
                        }
                      })
                    )
                  }
                };
              }
            })
          )
        }
      };
    }
  }
);

export const queryType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'Database',
    fields: () => {
      return {
        schematicCollections: {
          type: new graphql.GraphQLList(schematicCollectionForNgNewType),
          resolve: () => {
            try {
              return schematicCollectionsForNgNew();
            } catch (e) {
              console.log(e);
              throw new Error(
                `Error when reading the collection list. Message: "${
                  e.message
                }"`
              );
            }
          }
        },
        workspace: {
          type: new graphql.GraphQLNonNull(workspaceType),
          args: {
            path: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) }
          },
          resolve: (_root, args: any) => {
            try {
              if (!files[args.path]) {
                listFiles(args.path);
              }
              const packageJson = readJsonFile('./package.json', args.path)
                .json;
              const angularJson = readJsonFile('./angular.json', args.path)
                .json;

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
          }
        },
        editors: {
          type: new graphql.GraphQLList(editorSupportType),
          resolve: () => {
            return readEditors();
          }
        },
        availableExtensions: {
          type: new graphql.GraphQLList(extensionType),
          args: {
            name: { type: graphql.GraphQLString }
          },
          resolve: (_: any, args: any) => {
            try {
              return filterByName(availableExtensions(), args);
            } catch (e) {
              console.log(e);
              throw new Error(
                `Error when reading the list of extensions. Message: "${
                  e.message
                }"`
              );
            }
          }
        },
        commandStatus: {
          type: commandResultType,
          resolve: (_root: any, args: any) => {
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
          }
        },
        directory: {
          type: new graphql.GraphQLNonNull(filesType),
          resolve: async (_: any, args: any) => {
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
          },
          args: {
            path: { type: graphql.GraphQLString },
            onlyDirectories: { type: graphql.GraphQLBoolean },
            showHidden: { type: graphql.GraphQLBoolean }
          }
        }
      };
    }
  }
);

export const mutationType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'Mutation',
    fields: () => {
      return {
        ngAdd: {
          type: commandStartedType,
          args: {
            path: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
            name: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) }
          },
          resolve: async (_root: any, args: any) => {
            try {
              return runCommand(args.path, findClosestNg(args.path), [
                'add',
                args.name
              ]);
            } catch (e) {
              console.log(e);
              throw new Error(
                `Error when running 'ng add'. Message: "${e.message}"`
              );
            }
          }
        },
        ngNew: {
          type: commandStartedType,
          args: {
            path: {
              type: new graphql.GraphQLNonNull(graphql.GraphQLString)
            },
            name: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
            collection: {
              type: new graphql.GraphQLNonNull(graphql.GraphQLString)
            }
          },
          resolve: async (_root: any, args: any) => {
            try {
              return runCommand(args.path, findClosestNg(__dirname), [
                'new',
                args.name,
                `--directory=${args.name}`,
                `--collection=${args.collection}`
              ]);
            } catch (e) {
              console.log(e);
              throw new Error(
                `Error when running 'ng new'. Message: "${e.message}"`
              );
            }
          }
        },
        generate: {
          type: commandStartedType,
          args: {
            path: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
            genCommand: {
              type: new graphql.GraphQLList(graphql.GraphQLString)
            },
            dryRun: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) }
          },
          resolve: async (_root: any, args: any) => {
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
          }
        },
        runNg: {
          type: commandStartedType,
          args: {
            path: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
            runCommand: { type: new graphql.GraphQLList(graphql.GraphQLString) }
          },
          resolve: async (_root: any, args: any) => {
            try {
              return runCommand(
                args.path,
                findClosestNg(args.path),
                args.runCommand
              );
            } catch (e) {
              console.log(e);
              throw new Error(
                `Error when running 'ng ...'. Message: "${e.message}"`
              );
            }
          }
        },
        runNpm: {
          type: commandStartedType,
          args: {
            path: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
            npmClient: {
              type: new graphql.GraphQLNonNull(graphql.GraphQLString)
            },
            runCommand: { type: new graphql.GraphQLList(graphql.GraphQLString) }
          },
          resolve: async (_root: any, args: any) => {
            try {
              return runCommand(
                args.path,
                findExecutable(args.npmClient, args.path),
                args.runCommand
              );
            } catch (e) {
              console.log(e);
              throw new Error(
                `Error when running npm script. Message:"${e.message}"`
              );
            }
          }
        },
        stop: {
          type: new graphql.GraphQLObjectType({
            name: 'StopResult',
            fields: {
              result: { type: graphql.GraphQLBoolean }
            }
          }),
          resolve: async () => {
            try {
              stopAllCommands();
              return { result: true };
            } catch (e) {
              console.log(e);
              throw new Error(
                `Error when stopping commands. Message: "${e.message}"`
              );
            }
          }
        },
        openInEditor: {
          type: new graphql.GraphQLObjectType({
            name: 'OpenInEditor',
            fields: {
              response: {
                type: new graphql.GraphQLNonNull(graphql.GraphQLString)
              }
            }
          }),
          args: {
            editor: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
            path: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) }
          },
          resolve: (_root: any, args: any) => {
            try {
              openInEditor(args.editor, args.path);
              return { response: 'Success' };
            } catch (e) {
              console.log(e);
              throw new Error(
                `Error when opening an editor. Message: "${e.message}"`
              );
            }
          }
        }
      };
    }
  }
);

function runCommand(cwd: string, program: string, cmds: string[]) {
  stopAllCommands();
  const command = `${program} ${cmds.join(' ')}`;
  const commandRunning = spawn(program, cmds, { cwd, cols: 100 });
  commandInProgress = {
    command,
    status: 'inprogress',
    out: '',
    commandRunning
  };

  commandRunning.on('data', (data: any) => {
    if (commandInProgress && commandInProgress.command === command) {
      commandInProgress.out += data.toString();
    }
  });

  commandRunning.on('exit', (code: any) => {
    if (commandInProgress && commandInProgress.command === command) {
      commandInProgress.status = code === 0 ? 'success' : 'failure';
    }
  });
  return { command };
}

function stopAllCommands() {
  if (commandInProgress && commandInProgress.commandRunning) {
    if (os.platform() === 'win32') {
      commandInProgress.commandRunning.kill();
    } else {
      commandInProgress.commandRunning.kill('SIGKILL');
    }
  }
  commandInProgress = null;
}

function listFiles(path: string) {
  setTimeout(() => {
    files[path] = listFilesRec(path);
  }, 0);
}

export const buildSchema: graphql.GraphQLSchema = new graphql.GraphQLSchema({
  query: queryType,
  mutation: mutationType
});

export const app: express.Express = express();
app.use(
  '/graphql',
  graphqlHTTP({
    schema: buildSchema,
    rootValue: global,
    graphiql: true
  })
);

app.get('/workspaces', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

app.get('/workspace/*', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

// workspaces
app.use(express.static(path.join(__dirname, 'public')));

export function start(port: number) {
  app.listen(port ? port : 7777);
}

if (process.argv[2]) {
  start(+process.argv[2]);
}
