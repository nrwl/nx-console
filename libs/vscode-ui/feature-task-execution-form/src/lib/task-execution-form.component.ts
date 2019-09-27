import { Component, ChangeDetectionStrategy, Inject } from '@angular/core';
import { FormControl, FormGroup, FormBuilder } from '@angular/forms';
import { MOCK_COMPONENT_ARCHITECT } from './mock-component-architect';
import {
  TASK_EXECUTION_SCHEMA,
  TaskExecutionSchema
} from './task-execution-form.schema';

@Component({
  selector: 'vscode-ui-task-execution-form',
  templateUrl: './task-execution-form.component.html',
  styleUrls: ['./task-execution-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskExecutionFormComponent {
  taskExecForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    @Inject(TASK_EXECUTION_SCHEMA) readonly architect: TaskExecutionSchema
  ) {
    this.buildForm();
  }

  buildForm(): void {
    this.taskExecForm = this.fb.group({});

    this.architect.schema.forEach(schema => {
      this.taskExecForm.addControl(
        schema.name,
        new FormControl(schema.defaultValue)
      );
    });
  }
}
