import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, FormBuilder } from '@angular/forms';
import { MOCK_COMPONENT_ARCHITECT } from './mock-component-architect';

@Component({
  selector: 'vscode-ui-task-execution-form',
  templateUrl: './task-execution-form.component.html',
  styleUrls: ['./task-execution-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskExecutionFormComponent {
  architect = MOCK_COMPONENT_ARCHITECT;
  taskExecForm: FormGroup;

  constructor(private readonly fb: FormBuilder) {
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
