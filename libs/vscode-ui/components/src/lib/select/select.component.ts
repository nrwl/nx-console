import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { ControlContainer, FormGroup } from '@angular/forms';
import { Option } from '@nx-console/schema';

@Component({
  selector: 'nx-console-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectComponent implements OnInit {
  @Input() field: Option;
  @Input() value: string;
  @Output() readonly valueChange = new EventEmitter<string>();
  parentFormGroup: FormGroup;

  constructor(private readonly controlContainer: ControlContainer) {}

  ngOnInit() {
    this.parentFormGroup = this.controlContainer.control as FormGroup;
  }

  updateValue(updated: string): void {
    this.valueChange.emit(updated);
  }

  getOptionTooltip(optionValue: string): string | null {
    if (
      this.field &&
      this.field.itemTooltips &&
      this.field.itemTooltips[optionValue]
    ) {
      return this.field.itemTooltips[optionValue];
    }
    return null;
  }
}
