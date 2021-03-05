import { Component, ViewChild } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { OptionType } from '@angular/cli/models/interface';
import { Option } from '@nx-console/schema';
import { SelectComponent } from './select.component';

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
  field = mockOption;
  formGroup = this.fb.group({ [this.field.name]: initialValue });
  @ViewChild('select', { static: true })
  selectComponent: SelectComponent;

  constructor(private readonly fb: FormBuilder) {}
}
describe('SelectComponent', () => {
  let fixture: ComponentFixture<ParentFormComponent>;
  let parent: ParentFormComponent;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [ParentFormComponent, SelectComponent],
        imports: [FormsModule, ReactiveFormsModule],
      }).compileComponents();
    })
  );
  beforeEach(() => {
    fixture = TestBed.createComponent(ParentFormComponent);
    parent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(parent).toBeDefined();
    expect(parent.selectComponent).toBeDefined();
  });

  describe('getOptionTooltip', () => {
    it('should get tooltip for option value', () => {
      parent.field = mockOption;
      expect(parent.selectComponent.getOptionTooltip('test')).toBe('testLabel');
    });
    it('should return null when there is no tooltip for option value', () => {
      parent.field = mockOption;
      expect(
        parent.selectComponent.getOptionTooltip('noTooltipValue')
      ).toBeNull();
    });
  });
});
