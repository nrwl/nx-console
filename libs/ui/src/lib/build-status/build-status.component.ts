import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import {
  CommandStatus,
  OpenInBrowserService,
  ShowItemInFolderService
} from '@angular-console/utils';
export interface BuildStatus {
  buildStatus:
    | 'build_pending'
    | 'build_inprogress'
    | 'build_success'
    | 'build_failure';
  progress: number;
  date: string;
  time: string;
  chunks: { name: string; file: string; size: string; type: string }[];
  errors: string[];
  serverHost?: string;
  serverPort?: number;
  isForProduction: boolean;
  outputPath?: string;
  indexFile?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ui-build-status',
  templateUrl: './build-status.component.html',
  styleUrls: ['./build-status.component.scss']
})
export class BuildStatusComponent {
  @Input() commandStatus: CommandStatus;
  @Input() status: BuildStatus;

  constructor(
    private readonly openInBrowserService: OpenInBrowserService,
    private readonly showItemInFolderService: ShowItemInFolderService
  ) {}

  statusClassName() {
    if (!this.status) {
      return '';
    } else {
      return `status-${this.status.buildStatus}`;
    }
  }

  serverUrl() {
    if (this.status && this.status.serverHost && this.status.serverPort) {
      return `http://${this.status.serverHost}:${this.status.serverPort}`;
    } else {
      return '';
    }
  }

  trackByError(_: number, err: string) {
    return err;
  }

  onServerOpen() {
    this.openInBrowserService.openUrl(this.serverUrl());
  }

  showItemInFolder(item: string) {
    this.showItemInFolderService.showItem(item);
  }
}
