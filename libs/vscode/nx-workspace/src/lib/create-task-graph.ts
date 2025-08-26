import { NxCreateTaskGraphRequest } from '@nx-console/language-server-types';
import { getNxlsClient } from '@nx-console/vscode-lsp-client';

export function createTaskGraph(
  targets: string[],
  projects?: string[],
  configuration?: string,
) {
  return getNxlsClient().sendRequest(NxCreateTaskGraphRequest, {
    targets,
    projects,
    configuration,
  });
}
