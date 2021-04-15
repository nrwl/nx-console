import { Component, DebugElement, ViewChild } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { OptionType } from '@angular/cli/models/interface';
import { Option } from '@nx-console/schema';
import { SelectComponent } from './select.component';
import { FieldItemsPipe } from '../field-items/field-items.pipe';

const initialValue = 'test';
const mockOption: Option = {
  name: 'style',
  description: 'The file extension to be used for style files.',
  type: OptionType.String,
  aliases: [],
  itemTooltips: {
    test: 'testLabel',
  },
  items: [initialValue, 'other', 'values'],
};

@Component({
  template: `
    <form [formGroup]="formGroup">
      <nx-console-select #select [field]="field"></nx-console-select>
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
  @ViewChild('select', { static: true })
  selectComponent: SelectComponent;

  constructor(private readonly fb: FormBuilder) {}
}
describe('SelectComponent', () => {
  let fixture: ComponentFixture<ParentFormComponent>;
  let parent: ParentFormComponent;
  let options: DebugElement[];

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [ParentFormComponent, SelectComponent, FieldItemsPipe],
        imports: [FormsModule, ReactiveFormsModule],
      }).compileComponents();
    })
  );
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
        (opt) => opt.nativeElement.textContent.trim() === 'other'
      );
      expect(noTooltipOption).toBeDefined();
      expect(noTooltipOption?.nativeElement.getAttribute('title')).toBeNull();
    });
  });

  it('should show long form options', () => {
    const longForm = {
      name: 'option-items-with-enum',
      type: OptionType.String,
      aliases: [],
      description: 'a long form select option',
      default: 'scss',
      items: {
        type: OptionType.String,
        enum: ['css', 'scss', 'styl', 'less'],
      },
    };
    parent.field = longForm;
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('#option-items-with-enum option')).length).toEqual(4);
  });
});
