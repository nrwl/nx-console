export interface CloudRun {
  linkId: string;
  workspaceId: string;
  command: string;
  startTime: string;
  endTime: string;
  branch: string;
  runGroup: string;
  tasks: { status: 0 | 1 }[];
}
