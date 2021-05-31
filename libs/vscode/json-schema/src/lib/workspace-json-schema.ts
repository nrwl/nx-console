import { watchFile } from '@nx-console/server';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { dirname, join } from 'path';
import * as vscode from 'vscode';
import { ExecutorInfo, getAllExecutors } from './get-all-executors';

let FILE_WATCHER: vscode.FileSystemWatcher;

export class WorkspaceJsonSchema {
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
        this.setupSchema(workspacePath, context.extensionUri, true);
      }
    );
    context.subscriptions.push(FILE_WATCHER);

    this.setupSchema(workspacePath, context.extensionUri);
  }

  setupSchema(
    workspacePath: string,
    extensionUri: vscode.Uri,
    clearPackageJsonCache = false
  ) {
    const filePath = vscode.Uri.joinPath(extensionUri, 'workspace-schema.json');
    const collections = getAllExecutors(workspacePath, clearPackageJsonCache);
    const contents = getWorkspaceJsonSchema(collections);
    vscode.workspace.fs.writeFile(
      filePath,
      new Uint8Array(Buffer.from(contents, 'utf8'))
    );
  }
}

function getWorkspaceJsonSchema(collections: ExecutorInfo[]) {
  const [builders, executors] = createBuildersAndExecutorsSchema(collections);
  const contents = createJsonSchema(builders, executors);
  return contents;
}

function createBuildersAndExecutorsSchema(
  collections: ExecutorInfo[]
): [string, string] {
  const builders = collections
    .map(
      (collection) => `
{
  "if": {
    "properties": { "builder": { "const": "${collection.name}" } },
    "required": ["builder"]
  },
  "then": {
    "properties": { 
      "options": {
        "$ref": "${collection.path}"
      }
    }
  }
}
`
    )
    .join(',');

  const executors = collections
    .map(
      (collection) => `
{   
  "if": {
    "properties": { "executor": { "const": "${collection.name}" } },
    "required": ["executor"]
  },
  "then": {
    "properties": { 
      "options": {
        "$ref": "${collection.path}"
      }
    }
  }
}
`
    )
    .join(',');

  return [builders, executors];
}

function createJsonSchema(builders: string, executors: string) {
  return `
  {
    "title": "JSON schema for Nx workspaces",
    "id": "https://nx.dev",
    "type": "object",
    "properties": {
      "version": {
        "type": "number",
        "enum": [1, 2]
      }
    },
    "allOf": [
      {
        "if": {
          "properties": { "version": { "const": 1 } },
          "required": ["version"]
        },
        "then": {
          "properties": { 
            "projects": {
              "type": "object",
              "additionalProperties": {
                "type": "object",
                "properties": {
                  "architect": {
                    "additionalProperties": {
                      "type": "object",
                      "properties": {
                        "builder": {
                          "type": "string"
                        },
                        "options": {
                          "type": "object"
                        }
                      },
                      "allOf": [
                       ${builders} 
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      }, 
      {
        "if": {
          "properties": { "version": { "const": 2 } },
          "required": ["version"]
        },
        "then": {
          "properties": { 
            "projects": {
              "type": "object",
              "additionalProperties": {
                "type": "object",
                "properties": {
                  "targets": {
                    "additionalProperties": {
                      "type": "object",
                      "properties": {
                        "executor": {
                          "type": "string"
                        },
                        "options": {
                          "type": "object"
                        }
                      },
                      "allOf": [
                       ${executors} 
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]
  }`;
}
