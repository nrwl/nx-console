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
  @Input() value: string;
  @Input() descriptionId: string;
  @Output() readonly valueChange = new EventEmitter<boolean>();

  updateValue(updated: boolean): void {
    this.valueChange.emit(updated);
  }
}
