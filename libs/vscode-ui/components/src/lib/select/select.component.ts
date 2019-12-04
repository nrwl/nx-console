import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { Option } from '@angular-console/schema';

@Component({
  selector: 'angular-console-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectComponent {
  @Input() field: Option;
  @Input() disabled = false;
  @Input() value: string;
  @Output() readonly valueChange = new EventEmitter<string>();

  updateValue(updated: string): void {
    this.valueChange.emit(updated);
  }
}
