import { Option } from '@nx-console/shared/schema';
import { WorkspaceJsonConfiguration } from '@nrwl/devkit';
export declare function verifyBuilderDefinition(project: string, command: string, workspaceJson: WorkspaceJsonConfiguration, workspaceType: 'ng' | 'nx'): Promise<{
    validBuilder: boolean;
    builderName: string;
    configurations: string[];
    options: Array<Option>;
}>;
