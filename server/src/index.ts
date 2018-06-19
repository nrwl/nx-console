import * as express from 'express';
import * as graphql from 'graphql';
import { spawn } from 'child_process';
import * as path from 'path';
import { readJsonFile } from './utils';
import { readSchematics } from './read-schematics';
import { GraphQLList } from 'graphql';
import { readProjects } from './read-projects';

const graphqlHTTP = require('express-graphql');

interface CommandResult {
  status: string;
  stdout: string;
  stderr: string;
}

const commands: {[k: string]: CommandResult} = {};

export const commandResultType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType({
  name: 'CommandResult',
  fields: () => {
    return {
      status: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString)
      },
      stdout: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString)
      },
      stderr: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString)
      }
    };
  }
});

export const commandStartedType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType({
  name: 'CommandStarted',
  fields: () => {
    return {
      command: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString)
      }
    };
  }
});

export const addonType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType({
  name: 'Addon',
  fields: () => {
    return {
      name: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString)
      },
      description: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString)
      },
      version: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString)
      }
    };
  }
});

export const schematicType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType({
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
                  type: new GraphQLList(graphql.GraphQLString)
                }
              };
            }
          })
        ),
      }
    };
  }
});

export const architectType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType({
  name: 'Architect',
  fields: () => {
    return {
      name: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString)
      },
      description: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString)
      },
      builder: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString)
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
                  type: new GraphQLList(graphql.GraphQLString)
                }
              };
            }
          })
        ),
      }
    };
  }
});

export const projectType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType({
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
          name: { type: graphql.GraphQLString },
        },
        resolve: (project: any, args: any) => {
          if (args.name) {
            return project.architect.filter(a => a.name === args.name);
          } else {
            return project.architect;
          }
        }
      }
    };
  }
});

export const workspaceType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType({
  name: 'Workspace',
  fields: () => {
    return {
      name: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString)
      },
      path: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString)
      },
      versions: {
        type: new graphql.GraphQLObjectType({
          name: 'WorkspaceVersions',
          fields: () => {
            return ({
              cli: {
                type: new graphql.GraphQLNonNull(graphql.GraphQLString)
              }
            });
          }
        })
      },
      addons: {
        type: new graphql.GraphQLList(addonType)
      },
      schematics: {
        type: new graphql.GraphQLList(schematicType),
        args: {
          collection: {type: graphql.GraphQLString},
          schematic: {type: graphql.GraphQLString}
        },
        resolve: (workspace: any, args: any) => {
          if (args.collection && args.schematic) {
            return workspace.schematics.filter(s => s.collection === args.collection && s.name === args.schematic);
          } else {
            return workspace.schematics;
          }
        }
      },
      projects: {
        type: new graphql.GraphQLList(projectType),
        args: {
          name: {type: graphql.GraphQLString}
        },
        resolve: (workspace: any, args: any) => {
          if (args.collection && args.schematic) {
            return workspace.projects.filter(s => s.name === args.name);
          } else {
            return workspace.projects;
          }
        }
      }
    };
  }
});

export const queryType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType({
  name: 'Database',
  fields: () => {
    return {
      workspace: {
        type: new graphql.GraphQLNonNull(workspaceType),
        args: {
          path: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) }
        },
        resolve: (_root, args: any) => {
          const packageJson = readJsonFile('./package.json', args.path).json;
          const addons = [];
          if (packageJson.devDependencies['@nrwl/schematics']) {
            addons.push({
              name: '@nrwl/schematics',
              description: 'Makes your CLI more awesome',
              version: '6.1.0'
            });
          }

          const angularJson = readJsonFile('./angular.json', args.path).json;
          const collectionName = angularJson.cli && angularJson.cli.defaultCollection ? angularJson.cli.defaultCollection : '@schematics/angular';
          const schematics = readSchematics(args.path, collectionName);
          const projects = readProjects(args.path, angularJson.projects);

          return ({
            name: packageJson.name,
            path: args.path,
            versions: {
              cli: packageJson.devDependencies['@angular/cli']
            },
            addons,
            schematics,
            projects
          });
        }
      },
      availableAddons: {
        type: new graphql.GraphQLList(addonType),
        resolve: () => {
          return [
            {
              name: '@nrwl/schematics',
              description: 'Makes your CLI more awesome',
              version: '6.1.0'
            }
          ];
        }
      },
      commandStatus: {
        type: commandResultType,
        args: {
          command: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) }
        },
        resolve: (_root: any, args: any) => {
          return commands[args.command];
        }
      }
    };
  }
});


export const mutationType: graphql.GraphQLObjectType = new graphql.GraphQLObjectType({
  name: 'Mutation',
  fields: () => {
    return {
      ngAdd: {
        type: commandStartedType,
        args: {
          path: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
          name: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
          version: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) }
        },
        resolve: async (_root: any, args: any) => {
          return runCommand(args.path, ['add', `${args.name}@${args.version}`]);
        }
      },
      generate: {
        type: commandStartedType,
        args: {
          path: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
          genCommand: { type: new graphql.GraphQLList(graphql.GraphQLString) },
          dryRun: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) }
        },
        resolve: async (_root: any, args: any) => {
          const dryRun = args.dryRun ? ['--dry-run'] : [];
          return runCommand(args.path, ['generate', ...args.genCommand, ...dryRun]);
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
      }
    };
  }
});

function runCommand(cwd: string, cmds: string[]) {
  const ng = path.join('node_modules', '.bin', 'ng');
  const command = `ng ${cmds.join(' ')}`;
  const commandRunning = spawn(ng, cmds, {cwd});
  commands[command] = {
    status: 'inprogress',
    stdout: '',
    stderr: ''
  };

  commandRunning.stdout.on('data', (data) => {
    commands[command].stdout += data.toString();
  });

  commandRunning.stderr.on('data', (data) => {
    commands[command].stderr += data.toString();
  });

  commandRunning.on('exit', (code) => {
    commands[command].status = code === 0 ? 'success' : 'failure';
  });

  return {command};
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

app.listen(7777);
