import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { Schema } from '@angular-console/schema';

@Component({
  selector: 'angular-console-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckboxComponent {
  @Input() field: Schema;
  @Input() disabled = false;
  @Input() value: 'true' | 'false';
  @Output() readonly valueChange = new EventEmitter<'true' | 'false'>();

  updateValue(updated: 'true' | 'false'): void {
    this.valueChange.emit(updated);
  }
}
