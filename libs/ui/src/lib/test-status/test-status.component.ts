import { Component, Input } from '@angular/core';

interface TestError {
  label: string;
  details: string;
}

export interface TestStatus {
  testStatus:
    | 'test_pending'
    | 'test_inprogress'
    | 'test_success'
    | 'test_failure';
  buildProgress: number;
  total: number;
  failure: number;
  success: number;
  errors: TestError[];
}

@Component({
  selector: 'ui-test-status',
  templateUrl: './test-status.component.html',
  styleUrls: ['./test-status.component.scss']
})
export class TestStatusComponent {
  @Input() status: TestStatus;

  statusClassName() {
    if (!this.status) {
      return '';
    } else {
      return `status-${this.status.testStatus}`;
    }
  }

  errorTrackByFn(_: number, err: TestError) {
    return err.label;
  }
}
