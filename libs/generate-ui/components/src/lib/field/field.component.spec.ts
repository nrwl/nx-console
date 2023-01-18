import { Component, ViewChild } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Option, OptionType } from '@nx-console/shared/schema';
import { FieldComponent, OptionComponent } from './field.component';
import { AutocompleteComponent } from '../autocomplete/autocomplete.component';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { FieldItemsPipe } from '../field-items/field-items.pipe';
import { InputComponent } from '../input/input.component';
import { MultipleSelectComponent } from '../multiple-select/multiple-select.component';
import { SelectComponent } from '../select/select.component';

const initialValue = false;
const mockOption: Option = {
  isRequired: false,
  name: 'skipImport',
  description: 'Do not import into the owning NgModule.',
  type: OptionType.Boolean,
  aliases: [],
};

@Component({
  template: `
    <form *ngIf="formGroup" [formGroup]="formGroup">
      <nx-console-field #control [field]="field"></nx-console-field>
    </form>
  `,
})
class ParentFormComponent {
  formGroup: FormGroup = this.fb.group({ [mockOption.name]: initialValue });
  _field = mockOption;
  get field(): Option {
    return this._field;
  }
  set field(field: Option) {
    this._field = field;
    this.formGroup = this.fb.group({ [field.name]: '' });
  }
  @ViewChild('control')
  fieldComponent: FieldComponent;

  constructor(private readonly fb: FormBuilder) {}
}
describe('FieldComponent', () => {
  let fixture: ComponentFixture<ParentFormComponent>;
  let parent: ParentFormComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        ParentFormComponent,
        FieldComponent,
        AutocompleteComponent,
        CheckboxComponent,
        FieldItemsPipe,
        InputComponent,
        MultipleSelectComponent,
        SelectComponent,
      ],
      imports: [ReactiveFormsModule],
    }).compileComponents();
  }));
  beforeEach(() => {
    fixture = TestBed.createComponent(ParentFormComponent);
    parent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(parent).toBeDefined();
    expect(parent.fieldComponent).toBeDefined();
  });

  it('should show correct component for field', () => {
    expect(parent.fieldComponent.component).toEqual(OptionComponent.Checkbox);
    expect(
      fixture.debugElement.query(By.css('nx-console-checkbox'))
    ).toBeDefined();

    parent.field = {
      name: 'style',
      description: 'The file extension to be used for style files.',
      type: OptionType.String,
      aliases: [],
      isRequired: false,
      itemTooltips: {
        test: 'testLabel',
      },
      items: ['test', 'some', 'other', 'values'],
    };
    fixture.detectChanges();
    expect(parent.fieldComponent.component).toEqual(OptionComponent.Select);
    expect(
      fixture.debugElement.query(By.css('nx-console-select'))
    ).toBeDefined();

    parent.field = {
      name: 'style',
      description: 'The file extension to be used for style files.',
      type: OptionType.String,
      aliases: [],
      isRequired: false,
      itemTooltips: {
        test: 'testLabel',
      },
      items: [
        'test',
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
    fixture.detectChanges();
    expect(parent.fieldComponent.component).toEqual(
      OptionComponent.Autocomplete
    );
    expect(
      fixture.debugElement.query(By.css('nx-console-autocomplete'))
    ).toBeDefined();

    parent.field = {
      name: 'style',
      description: 'The file extension to be used for style files.',
      type: OptionType.Array,
      isRequired: false,
      aliases: [],
      items: {
        type: OptionType.String,
        enum: ['test', 'noTooltipValue'],
      },
      itemTooltips: {
        test: 'testLabel',
      },
    };
    fixture.detectChanges();
    expect(parent.fieldComponent.component).toEqual(
      OptionComponent.MultiSelect
    );
    expect(
      fixture.debugElement.query(By.css('nx-console-multiple-select'))
    ).toBeDefined();

    parent.field = {
      name: 'style',
      description: 'The file extension to be used for style files.',
      type: OptionType.String,
      isRequired: false,
      aliases: [],
    };
    fixture.detectChanges();
    expect(parent.fieldComponent.component).toEqual(OptionComponent.Input);
    expect(
      fixture.debugElement.query(By.css('nx-console-input'))
    ).toBeDefined();
  });
});
