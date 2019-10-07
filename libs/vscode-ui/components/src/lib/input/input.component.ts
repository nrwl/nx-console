import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { Schema } from '@angular-console/schema';

@Component({
  selector: 'angular-console-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputComponent {
  @Input() field: Schema;
  @Input() disabled = false;
  @Input() value: string;
  @Output() readonly valueChange = new EventEmitter<string>();

  updateValue(updated: string): void {
    this.valueChange.emit(updated);
  }
}
