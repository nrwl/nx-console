import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { ControlContainer, FormControl, FormGroup } from '@angular/forms';
import { Option } from '@nx-console/schema';

@Component({
  selector: 'nx-console-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent {
  @Input() field: Option;
  @Input() disabled = false;
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
