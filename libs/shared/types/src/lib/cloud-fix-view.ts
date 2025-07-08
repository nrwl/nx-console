import { CIPEInfo, CIPERunGroup } from './cloud-info';

export interface NxCloudFixMessage {
  type: 'apply' | 'apply-locally' | 'reject' | 'webview-ready' | 'show-diff';
}

export interface NxCloudFixDetails {
  cipe: CIPEInfo;
  runGroup: CIPERunGroup;
  terminalOutput?: string;
  hasUncommittedChanges?: boolean;
}
