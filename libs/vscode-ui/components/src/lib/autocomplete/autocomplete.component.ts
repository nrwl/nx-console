import {
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {
  ControlContainer,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  UntypedFormControl,
  UntypedFormGroup,
} from '@angular/forms';
import { Option } from '@nx-console/shared/schema';
import {
  BehaviorSubject,
  fromEvent,
  interval,
  merge,
  Observable,
  of,
} from 'rxjs';
import {
  debounce,
  filter,
  map,
  scan,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';

import { getOptionItems } from '../field-items/field-items.pipe';

export enum AutocompleteNavKeys {
  Enter = 'Enter',
  ArrowUp = 'ArrowUp',
  ArrowDown = 'ArrowDown',
}

export const AUTOCOMPLETE_NAV_KEYS = new Set(['Enter', 'ArrowUp', 'ArrowDown']);

@Component({
  selector: 'nx-console-autocomplete',
  templateUrl: './autocomplete.component.html',
  styleUrls: ['./autocomplete.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: AutocompleteComponent,
      multi: true,
    },
  ],
})
export class AutocompleteComponent implements OnInit, ControlValueAccessor {
  private readonly _options$ = new BehaviorSubject<string[]>([]);
  visibleOptions: Observable<string[]>;
  selectedOption$: Observable<number | null>;

  @ViewChild('textInput', { static: true }) textInput: ElementRef;
  isFocused$: Observable<boolean>;

  private _field: Option;
  @Input() get field(): Option {
    return this._field;
  }
  set field(field: Option) {
    this._field = field;
    this._options$.next(getOptionItems(field) || []);
  }

  get parentFormGroup(): UntypedFormGroup {
    return this.controlContainer.control as UntypedFormGroup;
  }

  get control(): UntypedFormControl {
    return this.parentFormGroup?.get(this.field?.name) as UntypedFormControl;
  }

  onChange: any = () => {
    // noop
  };

  constructor(
    readonly _elementRef: ElementRef,
    private readonly controlContainer: ControlContainer
  ) {}

  ngOnInit() {
    this.isFocused$ = merge(
      fromEvent(this._elementRef.nativeElement, 'focusin').pipe(
        map(() => true)
      ),
      fromEvent(this._elementRef.nativeElement, 'focusout').pipe(
        map(() => false)
      )
    ).pipe(
      startWith(false),
      debounce(() => interval(300)),
      shareReplay(1)
    );

    this.visibleOptions = this._options$.pipe(
      switchMap((options) =>
        this.control.valueChanges.pipe(
          startWith(this.control.value || ''), // When panel is first opened, show the entire list
          map(
            (formValue) =>
              options &&
              options.filter((option) =>
                option.toLowerCase().includes(formValue.toLowerCase())
              )
          )
        )
      )
    );

    this.selectedOption$ = this.isFocused$.pipe(
      switchMap((isFocused) =>
        isFocused
          ? this.visibleOptions.pipe(
              switchMap((visibleOptions) =>
                visibleOptions.length
                  ? fromEvent<KeyboardEvent>(document, 'keyup').pipe(
                      map((event: KeyboardEvent) => event.key),
                      filter((key) => AUTOCOMPLETE_NAV_KEYS.has(key)),
                      scan(
                        ([index]: [number, string | null], key) =>
                          [
                            updatedOptionIndex(
                              <AutocompleteNavKeys>key,
                              index || 0,
                              visibleOptions.length
                            ),
                            key,
                          ] as [number, string | null],
                        [0, null] as [number, string | null]
                      ),
                      startWith([0, null] as [number, string | null]),

                      tap(([index, key]) => {
                        if (key === AutocompleteNavKeys.Enter) {
                          this.optionSelected(visibleOptions[index]);
                        }
                      }),

                      map(([selectedIndex]) => selectedIndex)
                    )
                  : of(null)
              )
            )
          : of(null)
      ),
      shareReplay(1)
    );
  }

  optionSelected(value: string) {
    this.control.setValue(value);
    this.textInput.nativeElement.blur();
  }

  writeValue(value: string) {
    if (this.control.value !== value) {
      this.control.setValue(value);
    }
  }

  registerOnChange(fn: any) {
    this.onChange = fn;
  }

  registerOnTouched() {
    // noop
  }

  setDisabledState(isDisabled: boolean) {
    isDisabled ? this.control.disable() : this.control.enable();
  }
}

/**
 * Updates the index of a selected option based on user input. If the new index
 * is beyond the scope of the available indices, it should return an index on other
 * side of the array (to loop around the list).
 * @param key {AutocompleteNavKeys} KeyboardEvent.key value
 * @param currentIndex {number} index before user input
 * @param numOptions {number} total number of options
 * @returns new option index
 */
function updatedOptionIndex(
  key: AutocompleteNavKeys,
  currentIndex: number,
  numOptions: number
): number {
  let modifier: -1 | 0 | 1 = 0;

  if (key === AutocompleteNavKeys.ArrowDown) {
    modifier++;
  }
  if (key === AutocompleteNavKeys.ArrowUp) {
    modifier--;
  }

  const selectedIndex = currentIndex + modifier;

  if (selectedIndex < 0) {
    return numOptions - 1;
  } else if (selectedIndex > numOptions - 1) {
    return 0;
  } else {
    return selectedIndex;
  }
}
