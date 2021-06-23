import { watchFile } from '@nx-console/server';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { dirname, join } from 'path';
import * as vscode from 'vscode';
import { ExecutorInfo, getAllExecutors } from './get-all-executors';

let FILE_WATCHER: vscode.FileSystemWatcher;

export class ProjectJsonSchema {
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
    const filePath = vscode.Uri.joinPath(extensionUri, 'project-schema.json');
    const collections = getAllExecutors(workspacePath, clearPackageJsonCache);
    const contents = getProjectJsonSchema(collections);
    vscode.workspace.fs.writeFile(
      filePath,
      new Uint8Array(Buffer.from(contents, 'utf8'))
    );
  }
}

function getProjectJsonSchema(collections: ExecutorInfo[]) {
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
      }, 
      "configurations": {
        "additionalProperties": {
          "$ref": "${collection.path}",
          "required": []
        }
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
      },
      "configurations": {
        "additionalProperties": {
          "$ref": "${collection.path}",
          "required": []
        }
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
    "title": "JSON schema for Nx projects",
    "id": "https://nx.dev/project-schema",
    "type": "object",
    "properties": {
      "targets": {
        "description": "Configures all the targets which define what tasks you can run against the project",
        "additionalProperties": {
          "type": "object",
          "properties": {
            "executor": {
              "description": "The function that Nx will invoke when you run this target",
              "type": "string"
            },
            "options": {
              "type": "object"
            },
            "configurations": {
              "description": "provides extra sets of values that will be merged into the options map",
              "additionalProperties": {
                "type": "object"
              }
            }
          },
          "allOf": [
            ${executors} 
          ]
        }
      }
    }
  }`;
}
