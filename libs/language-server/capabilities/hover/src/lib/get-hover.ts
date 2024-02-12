import {
  ASTNode,
  JSONDocument,
  StringASTNode,
} from 'vscode-json-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Hover, HoverParams } from 'vscode-languageserver';
import {
  getJsonLanguageService,
  isExecutorStringNode,
} from '@nx-console/language-server/utils';

export async function getHover(
  hoverParams: HoverParams,
  jsonAst: JSONDocument,
  document: TextDocument
): Promise<Hover | null | undefined> {
  const hover = await getJsonLanguageService()?.doHover(
    document,
    hoverParams.position,
    jsonAst
  );

  if (!hover) {
    return;
  }

  const offset = document.offsetAt(hoverParams.position);
  const node = jsonAst.getNodeFromOffset(offset);

  if (!node) {
    return hover;
  }

  if (isNxExecutorStringNode(node)) {
    hover.contents = {
      kind: 'markdown',
      value: `[View executor documentation on nx.dev](${constructExecutorUrl(
        node.value
      )})`,
    };
  }

  return hover;
}

function isNxExecutorStringNode(node: ASTNode): node is StringASTNode {
  return (
    isExecutorStringNode(node) &&
    (RegExp(/@nx|@nrwl\/\w+:\w+/).test(node.value) ||
      RegExp(/nx:\w+/).test(node.value))
  );
}

function constructExecutorUrl(executor: string): string {
  const [packageName, executorName] = executor
    .replace(/@nx|@nrwl/, '')
    .split(':');
  return `https://nx.dev/packages/${packageName}/executors/${executorName}`;
}
