import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { ControlContainer, FormGroup } from '@angular/forms';
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
  parentFormGroup: FormGroup;

  constructor(private readonly controlContainer: ControlContainer) {
    this.parentFormGroup = this.controlContainer.control as FormGroup;
  }

  updateValue(updated: string): void {
    this.valueChange.emit(updated);
  }
}
