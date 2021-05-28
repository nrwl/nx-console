import * as vscode from 'vscode';

export function vscodeJsonSchema(context: vscode.ExtensionContext) {
  // return new Promise((resolve, reject) => {
  //   //
  // });

  const filePath = vscode.Uri.joinPath(
    context.extensionUri,
    'workspace-schema.json'
  );

  const contents = `
  {
    "title": "JSON schema for Nx workspaces",
    "id": "https://nx.dev",
    "type": "object",
    "properties": {
      "version": {
        "type": "number",
        "enum": [1, 2]
      },
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
                  {
                    "if": {
                      "properties": { "builder": { "const": "@nrwl/node:build" } }
                    },
                    "then": {
                      "properties": { 
                        "options": {
                          "$ref": "/Users/jon/Dev/nx-console/node_modules/@nrwl/node/src/executors/build/schema.json"
                        }
                      }
                    }
                  }, 
                  {
                    "if": {
                      "properties": { "builder": { "const": "@nrwl/temp" } }
                    },
                    "then": {
                      "properties": { 
                        "options": { 
                           "properties": {
                              "port": {"type":"number"},
                              "additionalProperties": false
                           }
                        }
                      }
                    } 
                  }
                ]
              }
            }
          }
        }
      }
    }
  }`;
  vscode.workspace.fs.writeFile(
    filePath,
    new Uint8Array(Buffer.from(contents, 'utf8'))
  );
}
