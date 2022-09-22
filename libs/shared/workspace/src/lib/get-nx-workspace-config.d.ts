import type { NxJsonConfiguration, ProjectsConfigurations } from '@nrwl/devkit';
import { Logger } from '@nx-console/shared/schema';
export declare type NxWorkspaceConfiguration = ProjectsConfigurations & NxJsonConfiguration;
/**
 * There's a couple things that we need to handle here.
 *
 * 1. We need to check if the installed version of Nx is lower than 12. If that's the case then we need to just read the configurations like we used to do before. We need to do this because when we fallback to the Nx utils that are bundled with the extension, they throw errors when a workspace is lower than 13 :(
 * 2. If there is no version returned, then Nx isn't installed and we need to just use the nx utils to handle pure angular.json
 * 3. Otherwise get the nx utils and get the configuration
 * 4. Catch any errors and return the old way of reading the configuration
 *
 */
export declare function getNxWorkspaceConfig(workspacePath: string, format: 'nx' | 'angularCli', isNxWorkspace: boolean, logger: Logger): Promise<{
    workspaceConfiguration: NxWorkspaceConfiguration;
    configPath: string;
}>;
