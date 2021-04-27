import { Pipe, PipeTransform } from '@angular/core';
import { TaskExecutionSchema } from '@nx-console/schema';
import { formatTask } from './format-task';

@Pipe({
  name: 'formatTask',
})
export class FormatTaskPipe implements PipeTransform {
  transform(architect: TaskExecutionSchema): string {
    return formatTask(architect);
  }
}
