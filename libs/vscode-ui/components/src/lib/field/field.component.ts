import { Option } from '@nx-console/schema';
import { OptionType } from '@angular/cli/models/interface';
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
  FormControl,
  FormGroup,
} from '@angular/forms';
import { Subscription } from 'rxjs';

enum OptionComponent {
  Autocomplete = 'autocomplete',
  Checkbox = 'checkBox',
  Input = 'input',
  Select = 'select',
  MultiSelect = 'multiSelect'
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

  control = new FormControl('');
  parentFormGroup: FormGroup;

  disabled = false;
  onChange: any = () => {};
  onTouched: any = () => {};

  get value(): string {
    return this._value;
  }

  set value(value: string) {
    if (this._value !== value) {
      this._value = value;
      this.control.setValue(value);
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
    private controlContainer: ControlContainer
  ) {
    this.valueChangeSub = this.control.valueChanges.subscribe((value) => {
      this.value = value;
    });
    this.parentFormGroup = this.controlContainer.control as FormGroup;
  }

  camelToTitle(camelCase: string) {
    const result = camelCase.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  ngOnDestroy(): void {
    this.valueChangeSub.unsubscribe();
  }

  hasErrors(fieldName: string): boolean {
    const control = this.parentFormGroup.get(fieldName) as FormControl;
    if (!control) {
      return false;
    }

    return !!control.errors && (control.touched || control.dirty);
  }

  getErrors(fieldName: string): string[] {
    const control = this.parentFormGroup.get(fieldName) as FormControl;
    if (!control || !this.hasErrors(fieldName)) {
      return [];
    }

    return Object.keys(control.errors as any)
      .map(key => {
        if (!!control.errors) {
          if (key === 'required') {
            return `${fieldName
              .slice(0, 1)
              .toLocaleUpperCase()}${fieldName.slice(1)} is required`;
          } else {
            return control.errors[key];
          }
        }
      })
      .filter(error => !!error);
  }

  get hasItems(): boolean {
    return !!this.field.items && (this.field.items as string[]).length > 0;
  }

  get items(): string[] {
    return this.field.items as string[];
  }

  get component(): OptionComponent {
    if (this.field.type === OptionType.Boolean) {
      return OptionComponent.Checkbox;
    } else if (this.field.type === OptionType.Array && this.hasItems) {
      return OptionComponent.MultiSelect;
    } else {
      if (this.hasItems) {
        if (this.items.length > 10) {
          return OptionComponent.Autocomplete;
        } else {
          return OptionComponent.Select;
        }
      } else {
        return OptionComponent.Input;
      }
    }
  }
}
