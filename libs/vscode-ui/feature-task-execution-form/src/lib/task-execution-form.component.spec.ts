import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { OptionType, TaskExecutionSchema } from '@nx-console/schema';
import { TASK_EXECUTION_SCHEMA } from './task-execution-form.schema';
import { VscodeUiComponentsModule } from '@nx-console/vscode-ui/components';
import { ArgumentListModule } from '@nx-console/vscode-ui/argument-list';
import { FormatTaskPipe } from './format-task/format-task.pipe';
import { TaskExecutionFormComponent } from './task-execution-form.component';

const initialSchema: TaskExecutionSchema = {
  name: 'long-form-x-prompt-without-enum',
  command: 'generate',
  positional: 'workspace-generator:long-form-x-prompt-without-enum',
  cliName: 'ng',
  description: 'LongFormXPrompt',
  options: [
    {
      name: 'option-items-with-enum',
      type: OptionType.String,
      aliases: [],
      description: 'a long form select option',
      items: {
        type: OptionType.String,
        enum: ['css', 'scss', 'styl', 'less'],
      },
    },
    {
      name: 'a-multiselect-option',
      type: OptionType.Array,
      aliases: [],
      description: 'a multiselect option',
      items: ['one', 'two', 'three', 'four'],
    },
    {
      name: 'a-long-form-multiselect-option',
      type: OptionType.Array,
      aliases: [],
      description: 'a long form multiselect option',
      items: {
        type: OptionType.String,
        enum: ['five', 'six', 'seven', 'eight'],
      },
    },
  ],
};

describe('TaskExecutionFormComponent', () => {
  let component: TaskExecutionFormComponent;
  let fixture: ComponentFixture<TaskExecutionFormComponent>;
  let formGroup: FormGroup;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [TaskExecutionFormComponent, FormatTaskPipe],
        imports: [
          ReactiveFormsModule,
          VscodeUiComponentsModule,
          ArgumentListModule,
        ],
        providers: [
          { provide: TASK_EXECUTION_SCHEMA, useValue: initialSchema },
        ],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskExecutionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    formGroup = component.buildForm(initialSchema);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('validators', () => {
    it('should set validator for valid options', () => {
      const formControl = formGroup.get(
        'option-items-with-enum'
      ) as FormControl;
      expect(formControl?.validator).toBeDefined();
      formControl.setValue('not a valid option');
      expect(formControl.invalid).toBeTruthy();
      formControl.setValue('scss');
      expect(formControl.valid).toBeTruthy();
    });

    it('should set validator for Array type multiselect options', () => {
      const formControl = formGroup.get('a-multiselect-option') as FormControl;
      expect(formControl?.validator).toBeDefined();
      formControl.setValue(['not valid']);
      expect(formControl.invalid).toBeTruthy();
      formControl.setValue(['one', 'three']);
      expect(formControl.valid).toBeTruthy();
    });

    it('should set validator for long form options', () => {
      const formControl = formGroup.get(
        'a-long-form-multiselect-option'
      ) as FormControl;
      expect(formControl?.validator).toBeDefined();
      formControl.setValue(['not valid']);
      expect(formControl.invalid).toBeTruthy();
      formControl.setValue(['five', 'six']);
      expect(formControl.valid).toBeTruthy();
    });
  });
});
