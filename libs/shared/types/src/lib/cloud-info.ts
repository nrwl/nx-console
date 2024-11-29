export type CloudOnboardingInfo = {
  hasNxInCI: boolean;
  hasAffectedCommandsInCI: boolean;
  isConnectedToCloud: boolean;
  isWorkspaceClaimed: boolean;
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

export type CIPERunGroup = {
  ciExecutionEnv: string;
  runGroup: string;
  createdAt: number;
  completedAt: number | null;
  status: CIPEExecutionStatus;
  runs: CIPERun[];
};

export type CIPERun = {
  linkId: string;
  command: string;
  status?: CIPEExecutionStatus;
  numFailedTasks?: number;
  numTasks?: number;
  runUrl: string;
};

export type CIPEInfoError = {
  message: string;
  type: 'authentication' | 'network' | 'other';
};
