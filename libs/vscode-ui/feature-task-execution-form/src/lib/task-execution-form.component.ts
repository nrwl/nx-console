import { FieldTreeBin } from '@angular-console/vscode-ui/components';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  NgZone,
  OnInit,
  ViewChild
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators
} from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  ReplaySubject
} from 'rxjs';
import {
  distinctUntilChanged,
  map,
  shareReplay,
  startWith
} from 'rxjs/operators';

import {
  TASK_EXECUTION_SCHEMA,
  TaskExecutionSchema
} from './task-execution-form.schema';

declare global {
  interface Window {
    SET_TASK_EXECUTION_SCHEMA: (schema: TaskExecutionSchema) => void;
  }
}

@Component({
  selector: 'vscode-ui-task-execution-form',
  templateUrl: './task-execution-form.component.html',
  styleUrls: ['./task-execution-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskExecutionFormComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer', { static: false }) scrollContainer: ElementRef<
    HTMLElement
  >;
  @ViewChild('formHeaderContainer', { static: false })
  formHeaderContainer: ElementRef<HTMLElement>;

  private readonly activeFieldIdSubject = new BehaviorSubject<string>('');
  readonly activeFieldName$ = this.activeFieldIdSubject.pipe(
    distinctUntilChanged(),
    map(field => field.replace('-angular-console-field', ''))
  );

  private readonly architectSubject = new ReplaySubject<TaskExecutionSchema>();

  readonly architect$ = this.architectSubject.asObservable();

  readonly fieldBins$: Observable<FieldTreeBin[]> = this.architect$.pipe(
    map(architect => {
      return [
        {
          title: 'All fields',
          fields: architect.schema
        }
      ];
    })
  );

  readonly taskExecForm$: Observable<{
    form: FormGroup;
    architect: TaskExecutionSchema;
  }> = this.architect$.pipe(
    map(architect => ({ form: this.buildForm(architect), architect })),
    shareReplay()
  );

  readonly defaultValues$ = this.taskExecForm$.pipe(
    map(({ architect, form }) => {
      const configurationControl = form.get('configuration');

      const configurationName = configurationControl
        ? configurationControl.value
        : undefined;

      return this.getDefaultValuesForConfiguration(
        architect,
        configurationName
      );
    }),
    shareReplay()
  );

  readonly filterFieldsControl = new FormControl('');

  private readonly filterValue$ = (this.filterFieldsControl
    .valueChanges as Observable<string>).pipe(
    startWith(''),
    map(filterValue => filterValue.toLowerCase()),
    distinctUntilChanged()
  );

  readonly filteredFields$: Observable<Set<string>> = combineLatest([
    this.architect$.pipe(
      map(architect => {
        return architect.schema.map(field => {
          return {
            fieldName: field.name,
            fieldNameLowerCase: field.name.toLowerCase()
          };
        });
      })
    ),
    this.filterValue$
  ]).pipe(
    map(([fields, filterValue]) => {
      const filteredFields = new Set<string>();

      fields.forEach(field => {
        if (field.fieldNameLowerCase.includes(filterValue)) {
          filteredFields.add(field.fieldName);
        }
      });

      return filteredFields;
    }),
    shareReplay()
  );

  constructor(
    private readonly fb: FormBuilder,
    @Inject(TASK_EXECUTION_SCHEMA) public initialSchema: TaskExecutionSchema,
    private readonly ngZone: NgZone,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.architectSubject.next(this.initialSchema);

    window.SET_TASK_EXECUTION_SCHEMA = schema => {
      this.ngZone.run(() => {
        this.architectSubject.next(schema);
        setTimeout(() => {
          this.changeDetectorRef.detectChanges();
        }, 0);
      });
    };
  }

  ngAfterViewChecked() {
    if (!this.scrollContainer || this.scrollContainer.nativeElement.onscroll) {
      return;
    }
    this.ngZone.runOutsideAngular(() => {
      const scrollElement = this.scrollContainer.nativeElement;
      const formHeaderElement = this.formHeaderContainer.nativeElement;
      let scrolled = false;
      scrollElement.onscroll = () => {
        if (scrollElement.scrollTop === 0) {
          formHeaderElement.classList.remove('scrolled');
          scrolled = false;
        } else {
          if (!scrolled) {
            formHeaderElement.classList.add('scrolled');
            scrolled = true;
          }
        }

        const fields = Array.from(
          scrollElement.querySelectorAll<HTMLElement>('angular-console-field')
        );
        const top =
          Number(scrollElement.scrollTop) +
          Number(scrollElement.offsetTop) -
          24;
        const activeField =
          fields.find((e: HTMLElement) => e.offsetTop > top) || fields[0];

        if (this.activeFieldIdSubject.value !== activeField.id) {
          this.ngZone.run(() => {
            this.activeFieldIdSubject.next(activeField.id);
          });
        }
      };
    });
  }

  buildForm(architect: TaskExecutionSchema): FormGroup {
    const taskExecForm = this.fb.group({});

    if (architect.configurations && architect.configurations.length) {
      const configurationFormControl = new FormControl();
      taskExecForm.addControl('configuration', configurationFormControl);

      configurationFormControl.registerOnChange(() => {
        this.setConfiguration(
          taskExecForm,
          architect,
          configurationFormControl.value
        );
      });
    }

    const defaultValues = this.getDefaultValuesForConfiguration(architect);

    architect.schema.forEach(schema => {
      const validators: Array<ValidatorFn> = [];
      if (schema.required) {
        validators.push(Validators.required);
      }
      if (schema.enum) {
        const validValueSet = new Set(schema.enum);
        validators.push(control => {
          if (!validValueSet.has(control.value)) {
            return {
              enum: 'Please select a value from the auto-completable list'
            };
          }

          return null;
        });
      }
      taskExecForm.addControl(
        schema.name,
        new FormControl(defaultValues[schema.name], validators)
      );
    });

    return taskExecForm;
  }

  setConfiguration(
    taskExecForm: FormGroup,
    architect: TaskExecutionSchema,
    configurationName?: string
  ) {
    const defaultValues = this.getDefaultValuesForConfiguration(
      architect,
      configurationName
    );
    taskExecForm.patchValue(defaultValues);
  }

  private getDefaultValuesForConfiguration(
    architect: TaskExecutionSchema,
    configurationName?: string
  ) {
    const defaultValues: { [key: string]: string } = {};
    architect.schema.forEach(field => {
      defaultValues[field.name] = field.defaultValue || '';
    });

    if (architect.options) {
      architect.options.defaultValues.forEach(fieldValue => {
        defaultValues[fieldValue.name] = fieldValue.defaultValue || '';
      });
    }

    if (configurationName && architect.configurations) {
      const configuration = architect.configurations.find(
        c => c.name === configurationName
      )!;

      configuration.defaultValues.forEach(value => {
        defaultValues[value.name] = value.defaultValue || '';
      });
    }

    return defaultValues;
  }
}
