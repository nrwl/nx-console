import { Targets, Option, WorkspaceProjects } from '@nx-console/shared/schema';
import { TargetConfiguration as NxTargetConfiguration } from '@nrwl/devkit';
export declare function readTargetDef(targetName: string, targetsDef: NxTargetConfiguration, project: string): Targets;
export declare function readTargets(project: string, targets: any): Targets[];
export declare function readBuilderSchema(basedir: string, builder: string, workspaceType: 'ng' | 'nx', projects: WorkspaceProjects, projectDefaults?: {
    [name: string]: string;
}): Promise<Option[] | undefined>;
