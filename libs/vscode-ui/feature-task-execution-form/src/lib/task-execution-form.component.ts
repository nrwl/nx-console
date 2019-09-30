import {
  Component,
  ChangeDetectionStrategy,
  Inject,
  OnInit
} from '@angular/core';
import { FormControl, FormGroup, FormBuilder } from '@angular/forms';
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
export class TaskExecutionFormComponent implements OnInit {
  taskExecForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    @Inject(TASK_EXECUTION_SCHEMA) readonly architect: TaskExecutionSchema
  ) {}

  ngOnInit() {
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
