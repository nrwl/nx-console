import { Component, ViewChild } from '@angular/core';
import {
  waitForAsync,
  ComponentFixture,
  TestBed,
  tick,
  fakeAsync,
} from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Option, OptionType } from '@nx-console/schema';
import {
  AutocompleteComponent,
  AutocompleteNavKeys,
} from '../autocomplete/autocomplete.component';
import { filter, take, withLatestFrom } from 'rxjs/operators';
import { combineLatest } from 'rxjs';

const window: any = global;

const initialValue = 'test';
const mockOption: Option = {
  name: 'a-property',
  description: 'A property with more than 10 enum items.',
  type: OptionType.String,
  isRequired: false,
  aliases: [],
  items: [
    initialValue,
    'some',
    'other',
    'values',
    'but',
    'it',
    'is',
    'a',
    'really',
    'long',
    'list',
  ],
};

@Component({
  template: `
    <form [formGroup]="formGroup">
      <nx-console-autocomplete
        #autocomplete
        [field]="field"
      ></nx-console-autocomplete>
    </form>
  `,
})
class ParentFormComponent {
  formGroup = this.fb.group({ [mockOption.name]: initialValue });
  _field = mockOption;
  get field(): Option {
    return this._field;
  }
  set field(field: Option) {
    this._field = field;
    this.formGroup = this.fb.group({ [field.name]: '' });
  }
  @ViewChild('autocomplete', { static: true })
  autocompleteComponent: AutocompleteComponent;

  constructor(private readonly fb: FormBuilder) {}
}

describe('AutocompleteComponent', () => {
  let fixture: ComponentFixture<ParentFormComponent>;
  let parent: ParentFormComponent;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [ParentFormComponent, AutocompleteComponent],
        imports: [ReactiveFormsModule],
      }).compileComponents();
    })
  );
  beforeEach(() => {
    fixture = TestBed.createComponent(ParentFormComponent);
    parent = fixture.componentInstance;
    fixture.detectChanges();
  });

  const focusEvent = (event: 'focusin' | 'focusout') => {
    parent.autocompleteComponent._elementRef.nativeElement.dispatchEvent(
      new Event(event)
    );
    tick(300);
  };

  it('should create', () => {
    expect(parent).toBeDefined();
    expect(parent.autocompleteComponent).toBeDefined();
  });

  it('should know if it has focus', fakeAsync(() => {
    let focus;
    parent.autocompleteComponent.isFocused$.subscribe(
      (isFocussed) => (focus = isFocussed)
    );

    focusEvent('focusin');
    expect(focus).toBeTruthy();

    focusEvent('focusout');
    expect(focus).toBeFalsy();
  }));

  describe('visible options', () => {
    let receivedVisibleOptions: string[] = [];
    let enteredValue: string;
    beforeEach(() => {
      parent.autocompleteComponent.visibleOptions
        .pipe(
          withLatestFrom(parent.autocompleteComponent.control.valueChanges),
          filter(
            ([, autocompleteValue]) =>
              autocompleteValue && autocompleteValue === enteredValue
          ),
          take(1)
        )
        .subscribe(([visibleOptions]) => {
          receivedVisibleOptions = visibleOptions;
        });
    });

    it('should filter visible options', () => {
      enteredValue = 'o';
      parent.autocompleteComponent.control.setValue(enteredValue);
      expect(
        receivedVisibleOptions?.every((opt) => opt.indexOf(enteredValue) > -1)
      ).toBeTruthy();
    });

    it('should show autocomplete items when there are visible options and it has focus', fakeAsync(() => {
      focusEvent('focusin');
      enteredValue = 'l';
      parent.autocompleteComponent.control.setValue(enteredValue);
      expect(receivedVisibleOptions).toBeDefined();

      fixture.detectChanges();
      expect(
        fixture.debugElement.query(By.css('.autocomplete-panel'))
      ).toBeDefined();
      expect(fixture.debugElement.queryAll(By.css('.option')).length).toEqual(
        receivedVisibleOptions?.filter((opt) => opt.indexOf(enteredValue) > -1)
          .length
      );
    }));
  });

  it('selects option with keyboard', fakeAsync(() => {
    jest.spyOn(parent.autocompleteComponent, 'optionSelected');

    // dispatch event to set isFocused$ = true
    focusEvent('focusin');

    let receivedIndex;
    let receivedItem;
    let enteredValue = '';

    combineLatest([
      parent.autocompleteComponent.control.valueChanges,
      parent.autocompleteComponent.selectedOption$,
    ])
      .pipe(
        // check items on autocomplete value entered
        filter(([value]) => value === enteredValue)
      )
      .subscribe(([value, index]) => {
        receivedIndex = index;
        const items = value
          ? (mockOption.items as string[]).filter(
              (item) => item.indexOf(enteredValue) > -1
            )
          : (mockOption.items as string[]);
        receivedItem = items[index || 0];
      });

    // autocomplete 'o'
    enteredValue = 'o';
    parent.autocompleteComponent.control.setValue(enteredValue);

    // ArrowDown to second option and select on Enter
    window.document.dispatchEvent(
      new KeyboardEvent('keyup', {
        key: AutocompleteNavKeys.ArrowDown,
      })
    );
    window.document.dispatchEvent(
      new KeyboardEvent('keyup', {
        key: AutocompleteNavKeys.Enter,
      })
    );

    expect(receivedIndex).toEqual(1);
    expect(parent.autocompleteComponent.optionSelected).toHaveBeenCalledWith(
      receivedItem
    );
  }));
});
