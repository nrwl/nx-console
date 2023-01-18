import { Component, DebugElement, ViewChild } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Option, OptionType } from '@nx-console/shared/schema';
import { MultipleSelectComponent } from './multiple-select.component';
import { FieldItemsPipe } from '../field-items/field-items.pipe';

const initialValue = 'test';
const mockOption: Option = {
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

@Component({
  template: `
    <form [formGroup]="formGroup">
      <nx-console-multiple-select
        #select
        [field]="field"
      ></nx-console-multiple-select>
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
  @ViewChild('select')
  selectComponent: MultipleSelectComponent;

  constructor(private readonly fb: FormBuilder) {}
}
describe('MultipleSelectComponent', () => {
  let fixture: ComponentFixture<ParentFormComponent>;
  let parent: ParentFormComponent;
  let options: DebugElement[];

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        ParentFormComponent,
        MultipleSelectComponent,
        FieldItemsPipe,
      ],
      imports: [ReactiveFormsModule],
    }).compileComponents();
  }));
  beforeEach(() => {
    fixture = TestBed.createComponent(ParentFormComponent);
    parent = fixture.componentInstance;
    fixture.detectChanges();
    options = fixture.debugElement.queryAll(By.css('option'));
  });

  it('should create', () => {
    expect(parent).toBeDefined();
    expect(parent.selectComponent).toBeDefined();
  });

  describe('option tooltips', () => {
    it('should get tooltip for option value', () => {
      const testOption = options.find(
        (opt) => opt.nativeElement.textContent.trim() === 'test'
      );
      expect(testOption).toBeDefined();
      expect(testOption?.nativeElement.getAttribute('title')).toEqual(
        mockOption.itemTooltips && mockOption.itemTooltips['test']
      );
    });
    it('should ignore when there is no tooltip for option value', () => {
      const noTooltipOption = options.find(
        (opt) => opt.nativeElement.textContent.trim() === 'noTooltipValue'
      );
      expect(noTooltipOption).toBeDefined();
      expect(noTooltipOption?.nativeElement.getAttribute('title')).toBeNull();
    });
  });
});
