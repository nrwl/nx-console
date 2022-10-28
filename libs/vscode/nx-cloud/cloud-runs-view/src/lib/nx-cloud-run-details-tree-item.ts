import { differenceInMilliseconds, parseISO } from 'date-fns';
import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { CloudRun } from './cloud-run.model';

export class NxCloudRunDetailsTreeItem extends TreeItem {
  constructor(private cloudRun: CloudRun) {
    super('');
    this.description = `Branch: ${cloudRun.branch} ⌛ ${this.getDuration()}`;
    this.collapsibleState = TreeItemCollapsibleState.None;
  }

  getDuration() {
    const start = parseISO(this.cloudRun.startTime);
    const end = parseISO(this.cloudRun.endTime);
    return formatMillis(differenceInMilliseconds(end, start));
  }
}

export function formatMillis(millis: number) {
  let seconds = Math.floor(millis / 1000);

  if (seconds < 1) {
    return '< 1s';
  }

  let minutes = 0;
  let hours = 0;

  if (seconds >= 60) {
    minutes = Math.floor(seconds / 60);
    seconds = seconds - minutes * 60;
  }

  if (minutes >= 60) {
    hours = Math.floor(minutes / 60);
    minutes -= hours * 60;
  }

  seconds = Math.round(seconds);

  if (hours > 0) {
    return `${hours}h ${padToTwoDigits(minutes)}m ${padToTwoDigits(seconds)}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${padToTwoDigits(seconds)}s`;
  } else {
    return `${seconds}s`;
  }

  function padToTwoDigits(inc: number): string {
    return inc < 10 ? `0${inc}` : `${inc}`;
  }
}
