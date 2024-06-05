import { NxError } from '@nx-console/shared/types';
import { getNxWorkspacePath } from '@nx-console/vscode/configuration';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  Diagnostic,
  DiagnosticCollection,
  ExtensionContext,
  languages,
  Uri,
  Range,
  DiagnosticSeverity,
  commands,
} from 'vscode';

export function initErrorDiagnostics(context: ExtensionContext) {
  const diagnosticCollection = languages.createDiagnosticCollection('nx');

  context.subscriptions.push(diagnosticCollection);

  getNxWorkspace().then((nxWorkspace) => {
    setDiagnostics(nxWorkspace?.errors ?? [], diagnosticCollection);
    commands.executeCommand(
      'setContext',
      'nxConsole.hasWorkspaceErrors',
      nxWorkspace?.errors?.length
    );
  });

  const listener = onWorkspaceRefreshed(async () => {
    const nxWorkspace = await getNxWorkspace();
    setDiagnostics(nxWorkspace?.errors ?? [], diagnosticCollection);
    commands.executeCommand(
      'setContext',
      'nxConsole.hasWorkspaceErrors',
      nxWorkspace?.errors?.length
    );
  });

  if (listener) {
    context.subscriptions.push(listener);
  }
}

function setDiagnostics(
  errors: NxError[],
  diagnosticCollection: DiagnosticCollection
) {
  diagnosticCollection.clear();

  const diagnosticsByUri = new Map<string, Diagnostic[]>();
  errors.forEach((error) => {
    const uri = getUriForError(error);

    const diagnostic = new Diagnostic(
      new Range(0, 0, 0, 0),
      getMessageForError(error),
      DiagnosticSeverity.Error
    );

    if (!diagnosticsByUri.has(uri.toString())) {
      diagnosticsByUri.set(uri.toString(), [diagnostic]);
    } else {
      diagnosticsByUri.get(uri.toString())?.push(diagnostic);
    }
  });

  diagnosticsByUri.forEach((diagnostics, uri) => {
    diagnosticCollection.set(Uri.parse(uri), diagnostics);
  });
}

function getUriForError(error: NxError) {
  const workspacePath = getNxWorkspacePath();
  if (error.file) {
    return Uri.parse(join(workspacePath, error.file));
  }

  const nxJsonPath = join(workspacePath, 'nx.json');
  if (existsSync(nxJsonPath)) {
    return Uri.parse(nxJsonPath);
  }

  const lernaJsonPath = join(workspacePath, 'lerna.json');
  if (existsSync(lernaJsonPath)) {
    return Uri.parse(lernaJsonPath);
  }

  return Uri.parse(workspacePath);
}

function getMessageForError(error: NxError): string {
  if (error.message && error.cause?.message) {
    return `${error.message} \n ${error.cause.message}`;
  }
  if (
    (error.name === 'ProjectsWithNoNameError' ||
      error.name === 'MultipleProjectsWithSameNameError' ||
      error.name === 'ProjectWithExistingNameError') &&
    error.message
  ) {
    return error.message;
  }
  return error.stack ?? error.message ?? 'Unknown error';
}
