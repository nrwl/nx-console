import { Pipe, PipeTransform } from '@angular/core';
import { TaskExecutionSchema } from '@nx-console/shared/schema';

import { formatTask } from './format-task';

@Pipe({
  name: 'formatTask',
})
export class FormatTaskPipe implements PipeTransform {
  /**
   * Formats nx/ng task from the Task Execution Form Observable
   * @param {architect, form} maps to the taskExecForm$ Observable
   * @returns format task string with optional configuruation (args not included)
   */
  transform(architect: TaskExecutionSchema, configuration?: string): string {
    return formatTask(architect, configuration);
  }
}
