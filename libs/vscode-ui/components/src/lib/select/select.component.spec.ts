import { Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { OptionType } from '@angular/cli/models/interface';
import { Option, OptionComponent } from '@nx-console/schema';
import { SelectComponent } from './select.component';

const initialValue = 'test';
const mockOption: Option = {
  name: 'style',
  description: 'The file extension to be used for style files.',
  type: OptionType.String,
  component: OptionComponent.Select,
  aliases: [],
  itemTooltips: {
    test: 'testLabel'
  },
  items: [initialValue, 'other', 'values']
};

@Component({
  template: `
    <form [formGroup]="formGroup">
      <nx-console-select [field]="field"></nx-console-select>
    </form>
  `
})
class ParentFormComponent {
  field = mockOption;
  formGroup = this.fb.group({[this.field.name]: initialValue});
  @ViewChild(SelectComponent, {static: true}) selectComponent: SelectComponent;

  constructor(private fb: FormBuilder) {}
}
describe('SelectComponent', () => {
  let fixture: ComponentFixture<ParentFormComponent>;
  let parent: ParentFormComponent;
  let component: SelectComponent;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ParentFormComponent],
      imports: [ReactiveFormsModule]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ParentFormComponent);
    parent = fixture.componentInstance;
    component = parent.selectComponent;
    fixture.detectChanges();
  });

  describe('getOptionTooltip', () => {
    it('should get tooltip for option value', () => {
      component.field = mockOption;
      expect(component.getOptionTooltip('test')).toBe('testLabel');
    });
    it('should return null when there is no tooltip for option value', () => {
      component.field = mockOption;
      expect(component.getOptionTooltip('noTooltipValue')).toBeNull();
    });
  });
});
