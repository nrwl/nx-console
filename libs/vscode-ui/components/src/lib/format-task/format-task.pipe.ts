import { Pipe, PipeTransform } from '@angular/core';
import {
  TaskExecutionSchema,
  WORKSPACE_GENERATOR_NAME_REGEX
} from '@nx-console/schema';

@Pipe({
  name: 'formatTask'
})
export class FormatTaskPipe implements PipeTransform {
  transform(architect: TaskExecutionSchema): string {
    const positionals = architect.positional.match(
      WORKSPACE_GENERATOR_NAME_REGEX
    );
    if (architect.command === 'generate' && positionals && positionals.length) {
      architect = {
        ...architect,
        cliName: 'nx',
        command: `workspace-${positionals[1]}`,
        positional: positionals[2]
      };
    }
    return `${architect.cliName} ${architect.command} ${architect.positional}`;
  }
}
