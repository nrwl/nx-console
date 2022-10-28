export interface CloudRun {
  linkId: string;
  workspaceId: string;
  command: string;
  startTime: string;
  endTime: string;
  branch: string;
  runGroup: string;
  tasks: CloudRunTask[];
}

export interface CloudRunTask {
  status: 0 | 1;
  projectName: string;
}
