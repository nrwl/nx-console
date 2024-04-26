import {
  isExecutorStringNode,
  lspLogger,
} from '@nx-console/language-server/utils';
import { getExecutors } from '@nx-console/language-server/workspace';
import { importNxPackagePath } from '@nx-console/shared/npm';
import { dirname } from 'path';
import { JSONDocument } from 'vscode-json-languageservice';
import { DefinitionParams, LocationLink } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';

export async function getDefinition(
  workingPath: string,
  definitionParams: DefinitionParams,
  jsonAst: JSONDocument,
  document: TextDocument
): Promise<LocationLink[] | undefined> {
  const offset = document.offsetAt(definitionParams.position);
  const node = jsonAst.getNodeFromOffset(offset);

  if (!node || !isExecutorStringNode(node)) {
    return undefined;
  }

  const executors = await getExecutors(workingPath);

  const executor = executors.find((e) => e.name === node.value);

  if (!executor) {
    return undefined;
  }

  const { resolveImplementation } = await importNxPackagePath<
    typeof import('nx/src/config/schema-utils')
  >(workingPath, 'src/config/schema-utils', lspLogger);
  const executorFile = resolveImplementation(
    executor.implementationPath,
    dirname(executor.configPath)
  );

  return [
    LocationLink.create(
      URI.file(executorFile).toString(),
      // Link to start of file because we cannot find the exact location without parsing the file
      {
        start: {
          line: 0,
          character: 0,
        },
        end: {
          line: 0,
          character: 0,
        },
      },
      {
        start: {
          line: 0,
          character: 0,
        },
        end: {
          line: 0,
          character: 0,
        },
      },
      {
        // So that the underline is
        // "executor": "nx:build"
        //              ^^^^^^^^
        start: document.positionAt(node.offset + 1),
        end: document.positionAt(node.offset + node.length - 1),
      }
    ),
  ];
}
