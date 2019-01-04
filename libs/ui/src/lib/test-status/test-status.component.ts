import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommandStatus } from '@angular-console/utils';

interface TestError {
  label: string;
  details: string;
}

export interface TestStatus {
  testStatus:
    | 'test_pending'
    | 'test_inprogress'
    | 'test_success'
    | 'test_failure'
    | 'test_cancelled';
  buildProgress: number;
  total: number;
  failure: number;
  success: number;
  errors: TestError[];
  buildErrors: string[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ui-test-status',
  templateUrl: './test-status.component.html',
  styleUrls: ['./test-status.component.scss']
})
export class TestStatusComponent {
  @Input() commandStatus: CommandStatus;
  @Input() status: TestStatus;

  statusClassName() {
    if (!this.status) {
      return '';
    } else {
      return `status-${this.status.testStatus}`;
    }
  }

  trackByErrorLabel(_: number, err: TestError) {
    return err.label;
  }
}
