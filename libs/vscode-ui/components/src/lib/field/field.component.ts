import { Schema } from '@angular-console/schema';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  forwardRef,
  Input
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

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
export class FieldComponent implements ControlValueAccessor {
  @Input() field: Schema;
  _value: string;

  disabled = false;
  onChange: any = () => {};
  onTouched: any = () => {};

  get value(): string {
    return this._value;
  }

  set value(value: string) {
    this._value = value;
    this.onChange(this._value);
  }

  writeValue(value: string): void {
    this.value = value;
    this.changeDetectorRef.detectChanges();
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

  constructor(private readonly changeDetectorRef: ChangeDetectorRef) {}

  camelToTitle(camelCase: string) {
    const result = camelCase.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
}
