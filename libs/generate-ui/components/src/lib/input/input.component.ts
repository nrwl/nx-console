import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { ControlContainer, UntypedFormGroup } from '@angular/forms';
import { Option } from '@nx-console/shared/schema';

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

  get parentFormGroup(): UntypedFormGroup {
    return this.controlContainer.control as UntypedFormGroup;
  }

  constructor(private readonly controlContainer: ControlContainer) {}

  updateValue(updated: string): void {
    this.valueChange.emit(updated);
  }
}
