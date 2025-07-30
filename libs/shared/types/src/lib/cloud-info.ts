export type CloudOnboardingInfo = {
  hasNxInCI: boolean;
  isConnectedToCloud: boolean;
  isWorkspaceClaimed: boolean | undefined;
  personalAccessToken: string | undefined;
};

export type CIPEExecutionStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'
  | 'TIMED_OUT';

export type CIPEInfo = {
  ciPipelineExecutionId: string;
  branch: string;
  status: CIPEExecutionStatus;
  createdAt: number;
  completedAt: number | null;
  commitTitle: string | null;
  commitUrl: string | null;
  author?: string | null;
  authorAvatarUrl?: string | null;
  cipeUrl: string;
  runGroups: CIPERunGroup[];
};

export type NxAiFix = {
  aiFixId: string;
  taskIds: string[];
  terminalLogsUrls: Record<string, string>;
  suggestedFix?: string;
  suggestedFixDescription?: string;
  suggestedFixStatus: AITaskFixStatus;
  suggestedFixReasoning?: string;
  verificationStatus: AITaskFixStatus;
  userAction: AITaskFixUserAction;
  userActionOrigin?: AITaskFixUserActionOrigin;
};

export type CIPERunGroup = {
  ciExecutionEnv: string;
  runGroup: string;
  createdAt: number;
  completedAt: number | null;
  status: CIPEExecutionStatus;
  runs: CIPERun[];
  aiFix?: NxAiFix;
};

export type AITaskFixStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'NOT_EXECUTABLE';

export type AITaskFixUserAction =
  | 'NONE'
  | 'APPLIED'
  | 'REJECTED'
  | 'APPLIED_LOCALLY';

export type AITaskFixUserActionOrigin =
  | 'NX_CLOUD_APP'
  | 'NX_CONSOLE_VSCODE'
  | 'NX_CONSOLE_INTELLIJ';

export type CIPERun = {
  linkId?: string;
  executionId?: string;
  command: string;
  status?: CIPEExecutionStatus;
  failedTasks?: string[];
  numFailedTasks?: number;
  numTasks?: number;
  runUrl: string;
};

export type CIPEInfoError = {
  message: string;
  type: 'authentication' | 'network' | 'other';
};
