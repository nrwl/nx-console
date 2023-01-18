import { Option, OptionType } from '@nx-console/shared/schema';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  forwardRef,
  Input,
  OnDestroy,
} from '@angular/core';
import {
  ControlContainer,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  UntypedFormControl,
  UntypedFormGroup,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { getOptionItems } from '../field-items/field-items.pipe';

export enum OptionComponent {
  Autocomplete = 'autocomplete',
  Checkbox = 'checkBox',
  Input = 'input',
  Select = 'select',
  MultiSelect = 'multiSelect',
}

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
      multi: true,
    },
  ],
})
export class FieldComponent implements ControlValueAccessor, OnDestroy {
  @Input() field: Option;
  _value: string;
  valueChangeSub: Subscription;
  OptionComponent = OptionComponent;

  disabled = false;
  onChange: any = () => {
    // noop
  };
  onTouched: any = () => {
    // noop
  };

  get parentFormGroup(): UntypedFormGroup {
    return this.controlContainer.control as UntypedFormGroup;
  }

  get control(): UntypedFormControl {
    return this.parentFormGroup?.get(this.field?.name) as UntypedFormControl;
  }

  get value(): string {
    return this._value;
  }

  set value(value: string) {
    if (this._value !== value) {
      this._value = value;
      this.control.setValue(value, { emitEvent: false });
      this.onChange(this._value);
    }
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

  constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly controlContainer: ControlContainer
  ) {}

  ngOnDestroy(): void {
    if (this.valueChangeSub) {
      this.valueChangeSub.unsubscribe();
    }
  }

  camelToTitle(camelCase: string) {
    const result = camelCase.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  hasErrors(): boolean {
    if (!this.control) {
      return false;
    }

    return (
      !!this.control.errors && (this.control.touched || this.control.dirty)
    );
  }

  getErrors(fieldName: string): string[] {
    if (!this.control || !this.hasErrors()) {
      return [];
    }

    return Object.keys(this.control.errors ?? {})
      .map((key) => {
        if (this.control.errors) {
          if (key === 'required') {
            return `${fieldName
              .slice(0, 1)
              .toLocaleUpperCase()}${fieldName.slice(1)} is required`;
          } else {
            return this.control.errors[key];
          }
        }
      })
      .filter((error) => !!error);
  }

  get component(): OptionComponent {
    const items = getOptionItems(this.field);
    if (this.field.type === OptionType.Boolean) {
      return OptionComponent.Checkbox;
    } else if (items) {
      if (this.field.type === OptionType.Array) {
        return OptionComponent.MultiSelect;
      } else if (items.length > 10) {
        return OptionComponent.Autocomplete;
      } else {
        return OptionComponent.Select;
      }
    } else {
      return OptionComponent.Input;
    }
  }
}
