import {
  GeneratorContext,
  GeneratorSchema,
} from '@nx-console/shared/generate-ui-types';
import {
  CollectionInfo,
  Option,
  TaskExecutionSchema,
} from '@nx-console/shared/schema';
import { NxWorkspace, TreeNode } from '@nx-console/shared/types';
import type { ProjectConfiguration } from 'nx/src/devkit-exports';
import { SemVer } from 'semver';
import { StartupMessageDefinition } from 'shared/nx-console-plugins';
import { NotificationType, RequestType } from 'vscode-languageserver/node';

export const NxChangeWorkspace: NotificationType<string> = new NotificationType(
  'nx/changeWorkspace'
);

export const NxWorkspaceRefreshNotification: NotificationType<void> =
  new NotificationType('nx/refreshWorkspace');

export const NxWorkspaceRequest: RequestType<
  { reset: boolean },
  NxWorkspace,
  unknown
> = new RequestType('nx/workspace');

export type NxGeneratorsRequestOptions = {
  includeHidden: boolean;
  includeNgAdd: boolean;
};

export const NxGeneratorsRequest: RequestType<
  {
    options?: NxGeneratorsRequestOptions;
  },
  CollectionInfo[],
  unknown
> = new RequestType('nx/generators');

export type NxGeneratorOptionsRequestOptions = {
  collection: string;
  name: string;
  path: string;
};

export const NxGeneratorOptionsRequest: RequestType<
  { options: NxGeneratorOptionsRequestOptions },
  Option[],
  unknown
> = new RequestType('nx/generatorOptions');

export const NxProjectByPathRequest: RequestType<
  { projectPath: string },
  ProjectConfiguration | null,
  unknown
> = new RequestType('nx/projectByPath');

export const NxProjectsByPathsRequest: RequestType<
  { paths: string[] },
  { [path: string]: ProjectConfiguration | undefined },
  unknown
> = new RequestType('nx/projectsByPaths');

export const NxGeneratorContextFromPathRequest: RequestType<
  {
    generator?: TaskExecutionSchema;
    path: string;
  },
  | {
      path?: string;
      directory?: string;
      project?: string;
      projectName?: string;
    }
  | undefined,
  unknown
> = new RequestType('nx/generatorContextFromPath');

export const NxGeneratorContextV2Request: RequestType<
  {
    path: string;
  },
  GeneratorContext,
  unknown
> = new RequestType('nx/generatorContextV2');

export const NxVersionRequest: RequestType<undefined, SemVer, unknown> =
  new RequestType('nx/version');

export const NxProjectGraphOutputRequest: RequestType<
  undefined,
  {
    directory: string;
    relativePath: string;
    fullPath: string;
  },
  unknown
> = new RequestType('nx/projectGraphOutput');

export const NxCreateProjectGraphRequest: RequestType<
  { showAffected: boolean },
  string | undefined,
  unknown
> = new RequestType('nx/createProjectGraph');

export const NxProjectFolderTreeRequest: RequestType<
  undefined,
  {
    serializedTreeMap: { name: string; node: TreeNode }[];
    roots: TreeNode[];
  },
  unknown
> = new RequestType('nx/projectFolderTree');

export const NxTransformedGeneratorSchemaRequest: RequestType<
  GeneratorSchema,
  GeneratorSchema,
  unknown
> = new RequestType('nx/transformedGeneratorSchema');

export const NxStartupMessageRequest: RequestType<
  GeneratorSchema,
  StartupMessageDefinition | undefined,
  unknown
> = new RequestType('nx/startupMessage');

export const NxHasAffectedProjectsRequest: RequestType<
  undefined,
  boolean,
  unknown
> = new RequestType('nx/hasAffectedProjects');
