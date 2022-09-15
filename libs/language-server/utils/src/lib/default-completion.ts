import { CompletionType } from '@nx-console/shared/json-schema';
import { ASTNode } from 'vscode-json-languageservice';
import { isPropertyNode, isStringNode } from './node-types';

type DefaultCompletion = { glob?: string; completionType: CompletionType };

const defaultCompletionMap = new Map<string, DefaultCompletion>();

defaultCompletionMap.set('jestconfig', {
  glob: 'jest.config.@(js|ts)',
  completionType: CompletionType.file,
});
defaultCompletionMap.set('index', {
  glob: '*.html',
  completionType: CompletionType.file,
});
defaultCompletionMap.set('polyfills', {
  glob: '*.ts',
  completionType: CompletionType.file,
});
defaultCompletionMap.set('main', {
  glob: '*.ts',
  completionType: CompletionType.file,
});
defaultCompletionMap.set('tsconfig', {
  glob: 'tsconfig.*.json',
  completionType: CompletionType.file,
});
defaultCompletionMap.set('outputpath', {
  completionType: CompletionType.directory,
});
defaultCompletionMap.set('browsertarget', {
  completionType: CompletionType.projectTarget,
});
defaultCompletionMap.set('servertarget', {
  completionType: CompletionType.projectTarget,
});
defaultCompletionMap.set('buildtarget', {
  completionType: CompletionType.projectTarget,
});
defaultCompletionMap.set('target', {
  completionType: CompletionType.projectTarget,
});
defaultCompletionMap.set('devservertarget', {
  completionType: CompletionType.projectTarget,
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
