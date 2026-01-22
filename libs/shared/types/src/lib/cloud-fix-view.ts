import { CIPEInfo, CIPERunGroup } from './cloud-info';

export type NxCloudFixMessage =
  | { type: 'apply'; commitMessage?: string }
  | { type: 'apply-locally' }
  | { type: 'reject' }
  | { type: 'webview-ready' }
  | { type: 'show-diff' }
  | { type: 'rerun-ci' };

export interface NxCloudFixDetails {
  cipe: CIPEInfo;
  runGroup: CIPERunGroup;
  terminalOutput?: string;
  hasUncommittedChanges?: boolean;
}
