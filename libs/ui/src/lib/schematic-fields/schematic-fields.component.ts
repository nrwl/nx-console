import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input
} from '@angular/core';
import { Schema, CompletionResultType } from '@angular-console/schema';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import {
  refCount,
  startWith,
  debounceTime,
  publishReplay,
  switchMap,
  map
} from 'rxjs/operators';
import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import { Observable } from 'rxjs';

function fieldEnumOptions(field: Schema) {
  if (field.defaultValue) {
    return field.enum || [];
  } else {
    return [null, ...field.enum];
  }
}

export interface AutocompleteSchema extends Schema {
  completionValues?: Observable<CompletionResultType[]>;
}

export interface Payload {
  fields: Array<AutocompleteSchema>;
  getCompletions?: (
    f: Schema,
    v: string | null
  ) => Observable<CompletionResultType[]>;
  init?: { [k: string]: any };
  configurations?: boolean;
  selectedConfiguration: string | null;
}

export const schematicFieldsToFormGroup = (payload: Payload): FormGroup => {
  const { fields, getCompletions, init, configurations } = payload;

  const children = fields.reduce(
    (m, f) => {
      let value = init && init[f.name] ? init[f.name] : f.defaultValue;
      if (f.type === 'boolean') {
        if (value === 'false') {
          value = false;
        } else if (value === 'true') {
          value = true;
        }
      }
      const formControl = new FormControl(
        value,
        f.required ? Validators.required : null
      );

      if (f.completion && getCompletions) {
        f.completionValues = formControl.valueChanges.pipe(
          debounceTime(300),
          startWith(formControl.value),
          switchMap((v: string | null) => getCompletions(f, v)),
          publishReplay(1),
          refCount()
        );
      } else if (f.enum) {
        const completionValues: CompletionResultType[] = fieldEnumOptions(
          f
        ).map(o => {
          const completion: CompletionResultType = {
            value: o || '',
            display: o || '--'
          };
          return completion;
        });
        f.completionValues = formControl.valueChanges.pipe(
          debounceTime(300),
          startWith(formControl.value),
          map((v: string | null) => {
            if (!v) {
              return completionValues;
            } else {
              const lowercase = v.toLowerCase();
              return completionValues.filter(
                c => c.value && c.value.indexOf(lowercase) !== -1
              );
            }
          }),
          publishReplay(1),
          refCount()
        );
      }

      m[f.name] = formControl;

      return m;
    },
    {} as any
  );
  if (configurations) {
    children.configurations = new FormControl(
      payload.selectedConfiguration ? payload.selectedConfiguration : null
    );
  }

  return new FormGroup(children);
};

@Component({
  selector: 'ui-schematic-field',
  templateUrl: './schematic-fields.component.html',
  styleUrls: ['./schematic-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: 0 })),
      state('*', style({ opacity: 1 })),
      transition(`:enter`, animate(`300ms cubic-bezier(0.4, 0.0, 0.2, 1)`)),
      transition(`:leave`, animate(`300ms cubic-bezier(0.4, 0.0, 0.2, 1)`))
    ])
  ]
})
export class SchematicFieldsComponent implements OnInit {
  constructor() {}

  ngOnInit() {}

  @Input() field: Schema;
  @Input() formGroup: FormGroup;

  // this is needed because of a bug in MatAutocomplete
  triggerValueUpdate(name: string, value: string) {
    (this.formGroup.get(name) as FormControl).setValue(value, {
      emitEvent: true
    });
  }

  clearFormField(f: Schema) {
    const formControl = this.formGroup.get(f.name);
    if (formControl) {
      formControl.reset();
    }
  }

  fieldEnumOptions(field: Schema) {
    if (field.defaultValue) {
      return field.enum;
    } else {
      return [null, ...field.enum];
    }
  }

  fieldOption(value: any) {
    return value === null ? '--' : value;
  }

  toggleBooleanField(f: Schema) {
    const formControl = this.formGroup.get(f.name);
    if (formControl) {
      formControl.setValue(!formControl.value);
    }
  }
}
