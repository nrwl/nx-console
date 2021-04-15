import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { ControlContainer, FormControl, FormGroup } from '@angular/forms';
import { Option } from '@nx-console/schema';

@Component({
  selector: 'nx-console-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectComponent {
  @Input() field: Option;
  @Input() value: string;
  @Output() readonly valueChange = new EventEmitter<string>();

  get parentFormGroup(): FormGroup {
    return this.controlContainer.control as FormGroup;
  }

  constructor(private readonly controlContainer: ControlContainer) {}

  updateValue(updated: string): void {
    this.valueChange.emit(updated);
  }
}
