import {
  Component,
  OnDestroy,
  Input,
  SimpleChanges,
  OnChanges,
  ViewChild,
  ElementRef,
  OnInit,
  ViewEncapsulation
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormControl
} from '@angular/forms';
import {
  map,
  tap,
  takeUntil,
  switchMap,
  startWith,
  scan,
  debounceTime,
  filter,
  shareReplay
} from 'rxjs/operators';
import {
  Subject,
  BehaviorSubject,
  Observable,
  fromEvent,
  merge,
  of
} from 'rxjs';
import { Schema } from '@angular-console/schema';

export enum AutocompleteNavKeys {
  Enter = 'Enter',
  ArrowUp = 'ArrowUp',
  ArrowDown = 'ArrowDown'
}

export const AUTOCOMPLETE_NAV_KEYS = new Set(['Enter', 'ArrowUp', 'ArrowDown']);

@Component({
  selector: 'angular-console-autocomplete',
  templateUrl: './autocomplete.component.html',
  styleUrls: ['./autocomplete.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: AutocompleteComponent,
      multi: true
    }
  ]
})
export class AutocompleteComponent
  implements OnInit, OnDestroy, OnChanges, ControlValueAccessor {
  @Input() field: Schema;

  private readonly _options$ = new BehaviorSubject<string[]>([]);
  visibleOptions: Observable<string[]>;
  selectedOption$: Observable<number | null>;

  @ViewChild('textInput', { static: true }) textInput: ElementRef;
  control: FormControl;
  isFocused$: Observable<boolean>;

  private readonly destroying = new Subject<void>();

  constructor(private readonly _elementRef: ElementRef) {}

  writeValue(value: string) {
    if (this.control) {
      this.control.setValue(value);
    } else {
      this.control = new FormControl(value);
      this.visibleOptions = this._options$.pipe(
        switchMap(options =>
          this.control.valueChanges.pipe(
            startWith(''), // When panel is first opened, show the entire list
            map(formValue =>
              options.filter(option =>
                option.toLowerCase().includes(formValue.toLowerCase())
              )
            )
          )
        )
      );
    }
  }

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
      debounceTime(300),
      shareReplay(1)
    );

    this.selectedOption$ = this.isFocused$.pipe(
      switchMap(isFocused =>
        isFocused
          ? this.visibleOptions.pipe(
              switchMap(visibleOptions =>
                visibleOptions.length
                  ? fromEvent<KeyboardEvent>(document, 'keyup').pipe(
                      map((event: KeyboardEvent) => event.key),
                      filter(key => AUTOCOMPLETE_NAV_KEYS.has(key)),
                      scan(
                        ([index, _]: [number, string | null], key) =>
                          [
                            updatedOptionIndex(
                              <AutocompleteNavKeys>key,
                              index || 0,
                              visibleOptions.length
                            ),
                            key
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

    this.selectedOption$.subscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.field && this.field.enum) {
      this._options$.next(this.field.enum.map(String));
    }
  }

  optionSelected(value: string) {
    this.control.setValue(value);
    this.textInput.nativeElement.blur();
  }

  registerOnChange(fn: any) {
    this.control.valueChanges
      .pipe(
        tap(fn),
        takeUntil(this.destroying)
      )
      .subscribe();
  }

  registerOnTouched() {}

  setDisabledState(isDisabled: boolean) {
    isDisabled ? this.control.disable() : this.control.enable();
  }

  ngOnDestroy() {
    this.destroying.next();
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
