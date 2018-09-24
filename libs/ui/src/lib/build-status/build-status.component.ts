import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-build-status',
  templateUrl: './build-status.component.html',
  styleUrls: ['./build-status.component.css']
})
export class BuildStatusComponent {
  @Input()
  status: {
    watchStatus: 'inprogress' | 'success' | 'failure';
    date: string;
    time: string;
    chunks: { name: string; file: string; size: string; type: string }[];
    errors: string[];
  };
}
