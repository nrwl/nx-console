import { NxVersion } from '@nx-console/nx-version';
import {
  GeneratorContext,
  GeneratorSchema,
} from '@nx-console/shared-generate-ui-types';
import { StartupMessageDefinition } from '@nx-console/shared-nx-console-plugins';
import { GeneratorCollectionInfo, Option } from '@nx-console/shared-schema';
import {
  CIPEInfo,
  CIPEInfoError,
  CloudOnboardingInfo,
  NxWorkspace,
  PDVData,
  TreeNode,
} from '@nx-console/shared-types';
import type {
  ProjectConfiguration,
  Target,
  TargetConfiguration,
} from 'nx/src/devkit-exports';
import type { ConfigureAiAgentsStatusResponse } from 'nx/src/daemon/message-types/configure-ai-agents';
import { NotificationType, RequestType } from 'vscode-languageserver/node';

export const NxChangeWorkspace: NotificationType<string> = new NotificationType(
  'nx/changeWorkspace',
);

export const NxWorkspaceRefreshNotification: NotificationType<void> =
  new NotificationType('nx/refreshWorkspace');

export const NxWorkspaceRefreshStartedNotification: NotificationType<void> =
  new NotificationType('nx/refreshWorkspaceStarted');

export type NxWatcherStatus = 'operational' | 'daemonDisabled' | 'notRunning';

export const NxWatcherOperationalNotification: NotificationType<{
  status: NxWatcherStatus;
}> = new NotificationType('nx/fileWatcherOperational');

export const NxStopDaemonRequest: RequestType<undefined, undefined, unknown> =
  new RequestType('nx/stopDaemon');

export const NxStartDaemonRequest: RequestType<undefined, undefined, unknown> =
  new RequestType('nx/startDaemon');

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

export const NxGeneratorContextV2Request: RequestType<
  {
    path: string | undefined;
  },
  GeneratorContext,
  unknown
> = new RequestType('nx/generatorContextV2');

export const NxVersionRequest: RequestType<
  { reset: boolean },
  NxVersion,
  unknown
> = new RequestType('nx/version');

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
    nxCloudId?: string;
  },
  unknown
> = new RequestType('nx/cloudStatus');

export const NxCloudOnboardingInfoRequest: RequestType<
  { force?: boolean },
  CloudOnboardingInfo,
  unknown
> = new RequestType('nx/cloudOnboardingInfo');

export const NxConfigureAiAgentsStatusRequest: RequestType<
  Record<string, never>,
  ConfigureAiAgentsStatusResponse | null,
  unknown
> = new RequestType('nx/configureAiAgentsStatus');

export const NxPDVDataRequest: RequestType<
  { filePath: string },
  PDVData,
  unknown
> = new RequestType('nx/pdvData');

export const NxRecentCIPEDataRequest: RequestType<
  { branch?: string } | undefined,
  { info?: CIPEInfo[]; error?: CIPEInfoError; workspaceUrl?: string },
  unknown
> = new RequestType('nx/recentCIPEData');

export const NxParseTargetStringRequest: RequestType<
  string,
  Target | undefined,
  unknown
> = new RequestType('nx/parseTargetString');

export const NxCloudAuthHeadersRequest: RequestType<
  undefined,
  {
    'Nx-Cloud-Id'?: string;
    'Nx-Cloud-Personal-Access-Token'?: string;
    Authorization?: string;
  },
  unknown
> = new RequestType('nx/cloudAuthHeaders');

export const NxDownloadAndExtractArtifactRequest: RequestType<
  { artifactUrl: string },
  { content?: string; error?: string },
  unknown
> = new RequestType('nx/downloadAndExtractArtifact');
