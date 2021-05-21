import * as vscode from 'vscode';
import { Worker } from 'worker_threads';

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
    "title": "JSON schema for JSHint configuration files",
    "$schema": "http://json-schema.org/draft-04/schema#",
    "id": "https://json.schemastore.org/jshintrc",
    "type": "object",
    "properties": {
      "bitwise": {
        "description": "Prohibit the use of bitwise operators (&, |, ^, etc.)",
        "type": "boolean",
        "default": false
      },
      "curly": {
        "description": "Requires you to always put curly braces around blocks in loops and conditionals",
        "type": "boolean",
        "default": false
      },
      "eqeqeq": {
        "description": "Prohibits the use of",
        "type": "boolean",
        "default": false
      },
      "esversion": {
        "description": "The ECMAScript version to which the code must adhere",
        "type": "integer",
        "default": 5,
        "enum": [3, 5, 6, 7, 8, 9]
      }
    }
  }`;
  vscode.workspace.fs.writeFile(
    filePath,
    new Uint8Array(Buffer.from(contents, 'utf8'))
  );
}
