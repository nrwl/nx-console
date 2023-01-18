import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  ViewEncapsulation,
} from '@angular/core';
import { Option } from '@nx-console/shared/schema';

@Component({
  selector: 'nx-console-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class CheckboxComponent {
  @Input() field: Option;
  @Input() disabled = false;
  @Input() value: 'true' | 'false';
  @Output() readonly valueChange = new EventEmitter<'true' | 'false'>();

  updateValue(updated: 'true' | 'false'): void {
    this.valueChange.emit(updated);
  }
}
