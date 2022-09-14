import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { ControlContainer, UntypedFormGroup } from '@angular/forms';
import { Option } from '@nx-console/shared/schema';

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

  get parentFormGroup(): UntypedFormGroup {
    return this.controlContainer.control as UntypedFormGroup;
  }

  constructor(private readonly controlContainer: ControlContainer) {}

  updateValue(updated: string): void {
    this.valueChange.emit(updated);
  }
}
