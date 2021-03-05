import { Component, ViewChild } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { OptionType } from '@angular/cli/models/interface';
import { Option } from '@nx-console/schema';
import { MultipleSelectComponent } from './multiple-select.component';

const initialValue = 'test';
const mockOption: Option = {
  name: 'style',
  description: 'The file extension to be used for style files.',
  type: OptionType.String,
  aliases: [],
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
  field = mockOption;
  formGroup = this.fb.group({ [this.field.name]: initialValue });
  @ViewChild('select')
  selectComponent: MultipleSelectComponent;

  constructor(private readonly fb: FormBuilder) {}
}
describe('MultipleSelectComponent', () => {
  let fixture: ComponentFixture<ParentFormComponent>;
  let parent: ParentFormComponent;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [ParentFormComponent, MultipleSelectComponent],
        imports: [ReactiveFormsModule],
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
