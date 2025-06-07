import { ProviderResult, TreeItem } from 'vscode';
import { CIPEInfo, CIPERun, CIPERunGroup } from '@nx-console/shared-types';

export abstract class BaseRecentCIPETreeItem extends TreeItem {
  abstract type:
    | 'CIPE'
    | 'runGroup'
    | 'run'
    | 'label'
    | 'failedTask'
    | 'nxCloudFix';

  abstract getChildren(): ProviderResult<BaseRecentCIPETreeItem[]>;

  isCIPETreeItem(): this is CIPETreeItem {
    return this.type === 'CIPE';
  }

  isRunGroupTreeItem(): this is RunGroupTreeItem {
    return this.type === 'runGroup';
  }

  isRunTreeItem(): this is RunTreeItem {
    return this.type === 'run';
  }

  isFailedTaskTreeItem(): this is FailedTaskTreeItem {
    return this.type === 'failedTask';
  }

  isNxCloudFixTreeItem(): this is NxCloudFixTreeItem {
    return this.type === 'nxCloudFix';
  }
}

// Type interfaces for the tree items that will be implemented in other files
export interface CIPETreeItem extends BaseRecentCIPETreeItem {
  type: 'CIPE';
  cipe: CIPEInfo;
}

export interface RunGroupTreeItem extends BaseRecentCIPETreeItem {
  type: 'runGroup';
  runGroup: CIPERunGroup;
  cipeId: string;
}

export interface RunTreeItem extends BaseRecentCIPETreeItem {
  type: 'run';
  run: CIPERun;
  cipeId: string;
}

export interface FailedTaskTreeItem extends BaseRecentCIPETreeItem {
  type: 'failedTask';
  taskId: string;
  linkId?: string;
  executionId?: string;
  run?: CIPERun;
  cipeId?: string;
}

export interface NxCloudFixTreeItem extends BaseRecentCIPETreeItem {
  type: 'nxCloudFix';
  runGroup: CIPERunGroup;
  cipeId: string;
}
