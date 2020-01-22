import { Option } from '@nx-console/schema';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  forwardRef,
  Input,
  OnDestroy
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormControl
} from '@angular/forms';
import { Subscription } from 'rxjs';

/* Wrapper for select, text input, checkbox, autocomplete */

@Component({
  selector: 'nx-console-field',
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
export class FieldComponent implements ControlValueAccessor, OnDestroy {
  @Input() field: Option;
  _value: string;
  valueChangeSub: Subscription;

  control = new FormControl('');

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

  constructor(private readonly changeDetectorRef: ChangeDetectorRef) {
    this.valueChangeSub = this.control.valueChanges.subscribe(value => {
      this.value = value;
    });
  }

  camelToTitle(camelCase: string) {
    const result = camelCase.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  ngOnDestroy(): void {
    this.valueChangeSub.unsubscribe();
  }
}
