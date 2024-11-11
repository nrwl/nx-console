import {
  NxSourceMapFilesToProjectsMapRequest,
  NxTargetsForConfigFileRequest,
} from '@nx-console/language-server/types';
import { getNxlsClient } from '@nx-console/vscode/lsp-client';
import type { TargetConfiguration } from 'nx/src/devkit-exports';

export async function getSourceMapFilesToProjectsMap(): Promise<
  Record<string, string[]> | undefined
> {
  return getNxlsClient().sendRequest(
    NxSourceMapFilesToProjectsMapRequest,
    undefined
  );
}

export async function getTargetsForConfigFile(
  projectName: string,
  configFilePath: string
): Promise<Record<string, TargetConfiguration> | undefined> {
  return getNxlsClient().sendRequest(NxTargetsForConfigFileRequest, {
    projectName,
    configFilePath,
  });
}
