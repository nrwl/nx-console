import { CompletionType } from '@nx-console/json-schema';
import {
  isObjectNode,
  isPropertyNode,
  isStringNode,
} from '@nx-console/language-server/utils';
import { ASTNode } from 'vscode-json-languageservice';

type DefaultCompletion = { glob?: string; completionType: CompletionType };

const defaultCompletionMap = new Map<string, DefaultCompletion>();

defaultCompletionMap.set('jestconfig', {
  glob: 'jest.config.@(js|ts)',
  completionType: 'file',
});
defaultCompletionMap.set('index', {
  glob: '*.html',
  completionType: 'file',
});
defaultCompletionMap.set('polyfills', {
  glob: '*.ts',
  completionType: 'file',
});
defaultCompletionMap.set('main', {
  glob: '*.ts',
  completionType: 'file',
});
defaultCompletionMap.set('tsconfig', {
  glob: 'tsconfig.*.json',
  completionType: 'file',
});
defaultCompletionMap.set('outputpath', {
  completionType: 'directory',
});
defaultCompletionMap.set('browsertarget', {
  completionType: 'target',
});
defaultCompletionMap.set('servertarget', {
  completionType: 'target',
});
defaultCompletionMap.set('buildtarget', {
  completionType: 'target',
});
defaultCompletionMap.set('target', {
  completionType: 'target',
});

export function getDefaultCompletionType(
  node: ASTNode
): DefaultCompletion | undefined {
  const parent = node.parent;
  if (isPropertyNode(parent) && isStringNode(parent.keyNode)) {
    const key = parent.keyNode.value.toLowerCase();
    return defaultCompletionMap.get(key);
  }

  return undefined;
}

export function hasDefaultCompletionType(node: ASTNode): boolean {
  const parent = node.parent;
  if (isPropertyNode(parent) && isStringNode(parent.keyNode)) {
    const key = parent.keyNode.value.toLowerCase();
    return defaultCompletionMap.has(key);
  }

  return false;
}
