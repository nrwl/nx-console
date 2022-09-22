import { Logger } from '@nx-console/shared/schema';
import { NxWorkspaceConfiguration } from './get-nx-workspace-config';
export interface NxWorkspace {
    validWorkspaceJson: boolean;
    workspace: NxWorkspaceConfiguration;
    workspaceType: 'ng' | 'nx';
    configurationFilePath: string;
    workspacePath: string;
    isLerna: boolean;
    workspaceLayout: {
        appsDir: string;
        libsDir: string;
    };
}
export declare function nxWorkspace(workspacePath: string, logger?: Logger, reset?: boolean): Promise<NxWorkspace>;
