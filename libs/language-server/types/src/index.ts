import {
  GeneratorContext,
  GeneratorSchema,
} from '@nx-console/shared/generate-ui-types';
import {
  GeneratorCollectionInfo,
  Option,
  TaskExecutionSchema,
} from '@nx-console/shared/schema';
import {
  CloudOnboardingInfo,
  NxVersion,
  NxWorkspace,
  PDVData,
  TreeNode,
} from '@nx-console/shared/types';
import type {
  ProjectConfiguration,
  TargetConfiguration,
} from 'nx/src/devkit-exports';
import { StartupMessageDefinition } from 'shared/nx-console-plugins';
import { NotificationType, RequestType } from 'vscode-languageserver/node';

export const NxChangeWorkspace: NotificationType<string> = new NotificationType(
  'nx/changeWorkspace'
);

export const NxWorkspaceRefreshNotification: NotificationType<void> =
  new NotificationType('nx/refreshWorkspace');

export const NxWorkspaceRefreshStartedNotification: NotificationType<void> =
  new NotificationType('nx/refreshWorkspaceStarted');

export const NxStopDaemonRequest: RequestType<undefined, undefined, unknown> =
  new RequestType('nx/stopDaemon');

export const NxWorkspaceRequest: RequestType<
  { reset: boolean },
  NxWorkspace,
  unknown
> = new RequestType('nx/workspace');

export const NxWorkspaceSerializedRequest: RequestType<
  { reset: boolean },
  string,
  unknown
> = new RequestType('nx/workspaceSerialized');

export const NxWorkspacePathRequest: RequestType<undefined, string, unknown> =
  new RequestType('nx/workspacePath');

export type NxGeneratorsRequestOptions = {
  includeHidden: boolean;
  includeNgAdd: boolean;
};

export const NxGeneratorsRequest: RequestType<
  {
    options?: NxGeneratorsRequestOptions;
  },
  GeneratorCollectionInfo[],
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

export const NxProjectByRootRequest: RequestType<
  { projectRoot: string },
  ProjectConfiguration | null,
  unknown
> = new RequestType('nx/projectByRoot');

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
    path: string | undefined;
  },
  GeneratorContext,
  unknown
> = new RequestType('nx/generatorContextV2');

export const NxVersionRequest: RequestType<undefined, NxVersion, unknown> =
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
    serializedTreeMap: { dir: string; node: TreeNode }[];
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

export const NxSourceMapFilesToProjectsMapRequest: RequestType<
  undefined,
  Record<string, string[]>,
  unknown
> = new RequestType('nx/sourceMapFilesToProjectsMap');

export const NxTargetsForConfigFileRequest: RequestType<
  { projectName: string; configFilePath: string },
  Record<string, TargetConfiguration>,
  unknown
> = new RequestType('nx/targetsForConfigFile');

export const NxCloudStatusRequest: RequestType<
  undefined,
  {
    isConnected: boolean;
    nxCloudUrl?: string;
  },
  unknown
> = new RequestType('nx/cloudStatus');

export const NxCloudOnboardingInfoRequest: RequestType<
  undefined,
  CloudOnboardingInfo,
  unknown
> = new RequestType('nx/cloudOnboardingInfo');

export const NxPDVDataRequest: RequestType<
  { filePath: string },
  PDVData,
  unknown
> = new RequestType('nx/pdvData');
