import { Component, Input } from '@angular/core';

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
}

@Component({
  selector: 'ui-build-status',
  templateUrl: './build-status.component.html',
  styleUrls: ['./build-status.component.scss']
})
export class BuildStatusComponent {
  @Input() status: BuildStatus;

  statusClassName() {
    if (!this.status) {
      return '';
    } else {
      return `status-${this.status.buildStatus}`;
    }
  }

  errorTrackByFn(_: number, err: string) {
    return err;
  }
}
