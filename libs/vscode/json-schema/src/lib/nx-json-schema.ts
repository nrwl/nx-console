import { CollectionInfo } from '@nx-console/schema';
import { getGenerators, watchFile } from '@nx-console/server';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { dirname, join } from 'path';
import * as vscode from 'vscode';

let FILE_WATCHER: vscode.FileSystemWatcher;

export class NxJsonSchema {
  constructor(context: vscode.ExtensionContext) {
    const workspacePath = WorkspaceConfigurationStore.instance.get(
      'nxWorkspaceJsonPath',
      ''
    );

    if (FILE_WATCHER) {
      FILE_WATCHER.dispose();
    }

    /**
     * Whenever a new package is added to the package.json, we recreate the schema.
     * This allows newly added plugins to be added
     */
    FILE_WATCHER = watchFile(
      join(dirname(workspacePath), 'package.json'),
      () => {
        this.setupSchema(workspacePath, context.extensionUri);
      }
    );
    context.subscriptions.push(FILE_WATCHER);

    this.setupSchema(workspacePath, context.extensionUri);
  }

  async setupSchema(
    workspacePath: string,
    extensionUri: vscode.Uri,
  ) {
    const filePath = vscode.Uri.joinPath(extensionUri, 'nx-schema.json');
    const collections = await getGenerators(workspacePath);
    const contents = await getNxJsonSchema(collections);
    vscode.workspace.fs.writeFile(
      filePath,
      new Uint8Array(Buffer.from(contents, 'utf8'))
    );
  }
}

function getNxJsonSchema(collections: CollectionInfo[]) {
  // const [generators] = createGeneratorsSchema(collections);
  const contents = createJsonSchema();
  return contents;
}

function createJsonSchema() {
  return `
  {
    "title": "JSON schema for Nx configuration",
    "id": "https://nx.dev/core-concepts/configuration#nxjson",
    "type": "object",
    "properties": {
      "implicitDependencies": {
        "type": "object",
        "description": "Map of files to projects that implicitly depend on them."
      },
      "affected": {
        "type": "object",
        "description": "Default options for \`nx affected\`.",
        "properties": {
          "defaultBase": {
            "type": "string",
            "description": "Default based branch used by affected commands."
          }
        },
        "additionalProperties": false
      },
      "npmScope": {
        "type": "string",
        "description": "NPM Scope that the workspace uses."
      },
      "tasksRunnerOptions": {
        "additionalProperties": {
          "$ref": "#/definitions/tasksRunnerOptions"
        }
      },
      "targetDependencies": {
        "type": "object",
        "description": "Dependencies between different target names across all projects.",
        "additionalProperties": {
          "$ref": "#/definitions/targetDependencyConfig"
        }
      },
      "workspaceLayout": {
        "type": "object",
        "description": "Where new apps + libs should be placed.",
        "properties": {
          "libsDir": {
            "type": "string",
            "description": "Default folder name for libs."
          },
          "appsDir": {
            "type": "string",
            "description": "Default folder name for apps."
          }
        },
        "additionalProperties": false
      },
      "cli": {
        "$ref": "#/definitions/cliOptions"
      },
      "generators": {
        "$ref": "#/definitions/generatorOptions"
      },
      "plugins": {
        "type": "array",
        "description": "Plugins for extending the project graph.",
        "items": {
          "type": "string"
        }
      },
      "defaultProject": {
        "type": "string",
        "description": "Default project. When project isn't provided, the default project will be used."
      }
    },
    "definitions": {
      "cliOptions": {
        "type": "object",
        "description": "Default generator collection.",
        "properties": {
          "packageManager": {
            "type": "string",
            "description": "The default package manager to use.",
            "enum": ["yarn", "pnpm", "npm"]
          },
          "defaultCollection": {
            "type": "string",
            "description": "The default schematics collection to use."
          }
        },
        "additionalProperties": false
      },
      "generatorOptions": {
        "type": "object",
        "description": "List of default values used by generators."
      },
      "tasksRunnerOptions": {
        "type": "object",
        "description": "Available Task Runners.",
        "properties": {
          "runner": {
            "type": "string",
            "description": "Path to resolve the runner."
          },
          "options": {
            "type": "object",
            "description": "Default options for the runner."
          }
        },
        "additionalProperties": false
      },
      "targetDependencyConfig": {
        "type": "array",
        "description": "Target dependency.",
        "items": {
          "type": "object",
          "properties": {
            "projects": {
              "type": "string",
              "description": "The projects that the targets belong to.",
              "enum": ["self", "dependencies"]
            },
            "target": {
              "type": "string",
              "description": "The name of the target."
            }
          },
          "additionalProperties": false
        }
      }
    }
  }`;
}
