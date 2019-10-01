import {
  Component,
  ChangeDetectionStrategy,
  Input,
  SimpleChanges,
  OnChanges,
  forwardRef
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Schema } from '@angular-console/schema';

/* Wrapper for select, text input, checkbox, autocomplete */

@Component({
  selector: 'angular-console-field',
  templateUrl: './field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['field.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FieldComponent),
      multi: true
    }
  ]
})
export class FieldComponent implements ControlValueAccessor, OnChanges {
  @Input() field: Schema;
  @Input() _value: string;

  disabled = false;
  descriptionId: string;
  onChange: any = () => {};
  onTouched: any = () => {};

  ngOnChanges(changes: SimpleChanges) {
    if (changes.field && this.field) {
      this.descriptionId = this.field.name + '_setting_description';
    }
  }

  get value(): string {
    return this._value;
  }

  set value(value: string) {
    this._value = value;
    this.onChange(this._value);
  }

  writeValue(value: string): void {
    this.onChange(value);
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
