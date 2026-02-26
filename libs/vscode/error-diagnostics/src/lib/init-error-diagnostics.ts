import { NxError } from '@nx-console/shared-types';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { onWorkspaceRefreshed } from '@nx-console/vscode-lsp-client';
import { getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import {
  Diagnostic,
  DiagnosticCollection,
  ExtensionContext,
  languages,
  Uri,
  Range,
  DiagnosticSeverity,
} from 'vscode';
import { getMessageForError } from '@nx-console/shared-utils';
import { getUriForError } from './get-uri-for-error';

export function initErrorDiagnostics(context: ExtensionContext) {
  const diagnosticCollection = languages.createDiagnosticCollection('nx');

  context.subscriptions.push(diagnosticCollection);

  getNxWorkspace().then((nxWorkspace) => {
    setDiagnostics(nxWorkspace?.errors ?? [], diagnosticCollection);
  });

  const listener = onWorkspaceRefreshed(async () => {
    const nxWorkspace = await getNxWorkspace();
    setDiagnostics(nxWorkspace?.errors ?? [], diagnosticCollection);
  });

  if (listener) {
    context.subscriptions.push(listener);
  }
}

function setDiagnostics(
  errors: NxError[],
  diagnosticCollection: DiagnosticCollection,
) {
  diagnosticCollection.clear();

  const workspacePath = getNxWorkspacePath();
  const diagnosticsByUri = new Map<string, Diagnostic[]>();
  errors.forEach((error) => {
    const uri = getUriForError(error, workspacePath);

    const diagnostic = new Diagnostic(
      new Range(0, 0, 0, 0),
      getMessageForError(error),
      DiagnosticSeverity.Error,
    );

    if (!diagnosticsByUri.has(uri.toString())) {
      diagnosticsByUri.set(uri.toString(), [diagnostic]);
    } else {
      diagnosticsByUri.get(uri.toString())?.push(diagnostic);
    }
  });

  diagnosticsByUri.forEach((diagnostics, uriString) => {
    diagnosticCollection.set(Uri.parse(uriString), diagnostics);
  });
}
