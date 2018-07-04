import * as express from 'express';
import * as graphql from 'graphql';
import * as path from 'path';
import { filterByName, readJsonFile } from './utils';
import * as fs from 'fs';
import { dirSync } from 'tmp';
import { readSchematicCollections } from './read-schematic-collections';
import { readDescription, readProjects, readSchema } from './read-projects';
import { availableAddons, readAddons } from './read-addons';
import { readDependencies } from './read-dependencies';
import { schematicCollectionsForNgNew } from './read-ngnews';
import { statSync } from 'fs';
import { spawn } from 'pty.js';

const graphqlHTTP = require('express-graphql');

interface CommandResult {
  status: string;
  out: string;
  commandRunning: any;
}

let commands: { [k: string]: CommandResult } = {};
const files: { [path: string]: string[] } = {};

export const commandResultType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'CommandResult',
    fields: () => {
      return {
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

export const addonType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'Addon',
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
          type: new graphql.GraphQLList(
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
          ),
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
        addons: {
          type: new graphql.GraphQLList(addonType)
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
        projects: {
          type: new graphql.GraphQLList(projectType),
          args: {
            name: { type: graphql.GraphQLString }
          },
          resolve: (workspace: any, args: any) => {
            return filterByName(workspace.projects, args);
          }
        },
        files: {
          type: new graphql.GraphQLList(
            new graphql.GraphQLObjectType({
              name: 'File',
              fields: {
                name: {
                  type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                }
              }
            })
          ),
          args: {
            glob: { type: graphql.GraphQLString }
          },
          resolve: (workspace: any, args: any) => {
            if (!files[workspace.path]) return [];
            return files[workspace.path]
              .filter(f => f.indexOf(args.glob) > -1)
              .map(f => ({ name: f }));
          }
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

export const queryType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType(
  {
    name: 'Database',
    fields: () => {
      return {
        schematicCollections: {
          type: new graphql.GraphQLList(schematicCollectionForNgNewType),
          resolve: () => {
            return schematicCollectionsForNgNew();
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
                addons: readAddons(packageJson),
                projects: readProjects(args.path, angularJson.projects)
              };
            } catch (e) {
              console.log(e);
              throw e;
            }
          }
        },
        availableAddons: {
          type: new graphql.GraphQLList(addonType),
          resolve: () => {
            return availableAddons();
          }
        },
        commandStatus: {
          type: commandResultType,
          args: {
            command: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) }
          },
          resolve: (_root: any, args: any) => {
            const cmd = commands[args.command];
            if (cmd) {
              const r = { status: cmd.status, out: cmd.out };
              cmd.out = '';
              return r;
            } else {
              return { status: 'terminated', out: '' };
            }
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
            return runCommand(args.path, ['add', args.name]);
          }
        },
        ngNew: {
          type: commandStartedType,
          args: {
            path: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
            name: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
            collection: {
              type: new graphql.GraphQLNonNull(graphql.GraphQLString)
            }
          },
          resolve: async (_root: any, args: any) => {
            return runCommand(
              args.path,
              ['new', args.name, `--collection=${args.collection}`],
              false
            );
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
            const dryRun = args.dryRun ? ['--dry-run'] : [];
            return runCommand(args.path, [
              'generate',
              ...args.genCommand,
              ...dryRun
            ]);
          }
        },
        run: {
          type: commandStartedType,
          args: {
            path: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
            runCommand: { type: new graphql.GraphQLList(graphql.GraphQLString) }
          },
          resolve: async (_root: any, args: any) => {
            return runCommand(args.path, args.runCommand);
          }
        },
        stop: {
          type: new graphql.GraphQLObjectType({
            name: 'StopResult',
            fields: {
              result: { type: graphql.GraphQLBoolean }
            }
          }),
          args: {
            path: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) }
          },
          resolve: async () => {
            stopAllCommands();
            return { result: true };
          }
        }
      };
    }
  }
);

function runCommand(cwd: string, cmds: string[], localNg: boolean = true) {
  stopAllCommands();
  const command = `ng ${cmds.join(' ')} ${Math.random()}`;

  if (!directoryExists(cwd)) {
    commands[command] = {
      status: 'terminated',
      out: `Invalid directory provided: ${cwd}`,
      commandRunning: null
    };

    return { command };
  }

  const ng = localNg
    ? path.join('node_modules', '.bin', 'ng')
    : findClosestNg(__dirname);
  const commandRunning = spawn(ng, cmds, { cwd, cols: 80 });
  commands[command] = {
    status: 'inprogress',
    out: '',
    commandRunning
  };

  commandRunning.on('data', data => {
    if (commands[command]) {
      commands[command].out += data.toString();
    }
  });

  commandRunning.on('exit', code => {
    if (commands[command]) {
      commands[command].status = code === 0 ? 'success' : 'failure';
    }
  });
  return { command };
}

function findClosestNg(dir: string) {
  if (directoryExists(path.join(dir, 'node_modules'))) {
    return path.join(dir, 'node_modules', '.bin', 'ng');
  } else {
    return findClosestNg(path.dirname(dir));
  }
}

function stopAllCommands() {
  Object.values(commands).forEach(v => {
    if (v.commandRunning) {
      v.commandRunning.kill();
    }
  });
  commands = {};
}

function listFiles(path: string) {
  setTimeout(() => {
    files[path] = listFilesRec(path);
  }, 0);
}

function listFilesRec(dirName: string): string[] {
  if (dirName.indexOf('node_modules') > -1) return [];

  const res = [dirName];
  fs.readdirSync(dirName).forEach(c => {
    const child = path.join(dirName, c);
    try {
      if (!fs.statSync(child).isDirectory()) {
        res.push(child);
      } else if (fs.statSync(child).isDirectory()) {
        res.push(...listFilesRec(child));
      }
    } catch (e) {}
  });
  return res;
}

function directoryExists(filePath: string): boolean {
  try {
    return statSync(filePath).isDirectory();
  } catch (err) {
    return false;
  }
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

app.get('/workspaces/*', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

// workspaces
app.use(express.static(path.join(__dirname, 'public')));

const port = process.argv[2];
app.listen(port ? port : 7777);
