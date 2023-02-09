import { Clipboard } from '@angular/cdk/clipboard';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  NgZone,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest,
  merge,
  Observable,
  Subscription,
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  shareReplay,
  startWith,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { formatTask, getConfigurationFlag } from '../format-task/format-task';

import {
  ItemsWithEnum,
  Option,
  OptionType,
  TaskExecutionFormInitOutputMessage,
  TaskExecutionRunCommandOutputMessage,
  TaskExecutionSchema,
} from '@nx-console/shared/schema';
import { IdeCommunicationService } from '../ide-communication/ide-communication.service';

function hasKey<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return key in obj;
}

interface TaskExecutionForm {
  form: UntypedFormGroup;
  architect: TaskExecutionSchema;
}

@Component({
  selector: 'generate-ui-task-execution-form',
  templateUrl: './task-execution-form.component.html',
  styleUrls: ['./task-execution-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskExecutionFormComponent implements OnInit {
  private _scrollContainer: ElementRef<HTMLElement>;
  @ViewChild('scrollContainer') set scrollContainer(
    sc: ElementRef<HTMLElement>
  ) {
    this._scrollContainer = sc;
    this.setupActiveFieldTracking();
  }

  private _formHeaderContainer: ElementRef<HTMLElement>;
  @ViewChild('formHeaderContainer') set formHeaderContainer(
    fhc: ElementRef<HTMLElement>
  ) {
    this._formHeaderContainer = fhc;
    this.setupActiveFieldTracking();
  }

  get isMacOs(): boolean {
    return navigator.userAgent.indexOf('Mac') > -1;
  }

  private readonly activeFieldIdSubject = new BehaviorSubject<string>('');
  readonly activeFieldName$ = this.activeFieldIdSubject.pipe(
    distinctUntilChanged(),
    map((field) => field.replace('-nx-console-field', ''))
  );

  private readonly enableTaskExecutionDryRunOnChange$ = inject(
    IdeCommunicationService
  ).enableTaskExecutionDryRunOnChange$;

  readonly architect$: Observable<TaskExecutionSchema> = inject(
    IdeCommunicationService
  ).taskExecutionSchema$;

  readonly taskExecForm$: Observable<TaskExecutionForm> = this.architect$.pipe(
    map((architect) => ({ form: this.buildForm(architect), architect })),
    tap((taskExecForm) => {
      if (this.dryRunSubscription) {
        this.dryRunSubscription.unsubscribe();
        this.dryRunSubscription = undefined;
      }
      if (taskExecForm.architect.command === 'generate') {
        this.dryRunSubscription = combineLatest([
          taskExecForm.form.valueChanges,
          this.enableTaskExecutionDryRunOnChange$,
        ])
          .pipe(
            debounceTime(500),
            filter(
              ([, dryRunEnabled]) => dryRunEnabled && taskExecForm.form.valid
            )
          )
          .subscribe(() => {
            this.runCommand(taskExecForm, true);
          });
      }
    }),
    shareReplay({ refCount: true, bufferSize: 1 }),
    tap(() => {
      setTimeout(() => this.changeDetectorRef.detectChanges(), 0);
    })
  );

  readonly showDryRunBtn$: Observable<boolean> = combineLatest([
    this.taskExecForm$,
    this.enableTaskExecutionDryRunOnChange$,
  ]).pipe(
    map(([schema, enableTaskExecutionDryRunOnChange]) => {
      return (
        schema.architect.command === 'generate' &&
        !enableTaskExecutionDryRunOnChange
      );
    })
  );

  readonly defaultValues$ = this.taskExecForm$.pipe(
    mergeMap((taskExecForm) => {
      const configurationControl = taskExecForm.form.get('configuration');
      if (configurationControl) {
        return configurationControl.valueChanges.pipe(
          startWith(taskExecForm),
          map(() => taskExecForm)
        );
      }
      return [taskExecForm];
    }),
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
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  readonly filterFieldsControl = new UntypedFormControl('');

  private readonly filterValue$ = (
    this.filterFieldsControl.valueChanges as Observable<string>
  ).pipe(
    startWith(''),
    map((filterValue) => filterValue.toLowerCase()),
    distinctUntilChanged()
  );

  readonly filteredFields$: Observable<Set<string>> = combineLatest([
    this.architect$.pipe(
      map((architect) => {
        return architect.options.map((field) => {
          return {
            fieldName: field.name,
            fieldNameLowerCase: field.name.toLowerCase(),
          };
        });
      })
    ),
    this.filterValue$,
  ]).pipe(
    map(([fields, filterValue]) => {
      const filteredFields = new Set<string>();

      fields.forEach((field) => {
        if (field.fieldNameLowerCase.includes(filterValue)) {
          filteredFields.add(field.fieldName);
        }
      });

      return filteredFields;
    }),
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  runCommandArguments$ = this.taskExecForm$.pipe(
    mergeMap((taskExecForm) =>
      taskExecForm.form.valueChanges.pipe(
        startWith(taskExecForm.form.value),
        map(() => taskExecForm)
      )
    ),
    map(({ architect, form }) =>
      this.serializeArgs(
        form.value,
        architect,
        form.get('configuration')?.value
      )
    ),
    tap(() => setTimeout(() => this.changeDetectorRef.detectChanges(), 0))
  );

  validFields$ = this.getValidFields$(true);

  invalidFields$ = this.getValidFields$(false);

  dryRunSubscription?: Subscription;

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly ngZone: NgZone,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly clipboard: Clipboard,
    private readonly ideCommunicationService: IdeCommunicationService
  ) {}

  ngOnInit() {
    this.ideCommunicationService.postMessageToIde(
      new TaskExecutionFormInitOutputMessage()
    );
    this.architect$.subscribe(() => {
      this.scrollToTop();
      this.focusFirstElement();
    });
  }

  buildForm(architect: TaskExecutionSchema): UntypedFormGroup {
    const taskExecForm = this.fb.group({});

    if (architect.configurations && architect.configurations.length) {
      const configurationFormControl = new UntypedFormControl();
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

    architect.options.forEach((schema) => {
      const validators: Array<ValidatorFn> = [];
      if (schema.isRequired) {
        validators.push(Validators.required);
      }
      if (schema.enum || schema.items) {
        const validValueSet = new Set(
          schema.enum ||
            (schema.items as ItemsWithEnum).enum ||
            (schema.items as string[])
        );
        validators.push((control) => {
          if (
            (control.value &&
              !Array.isArray(control.value) &&
              !validValueSet.has(control.value)) ||
            // multiselect values are Array, check if all values are in Set
            (Array.isArray(control.value) &&
              !control.value.every((value) => validValueSet.has(value)))
          ) {
            return {
              enum: 'Please select a value from the auto-completable list',
            };
          }

          return null;
        });
      }

      const contextDefaultValue = (
        schema: Option,
        contextValues?: typeof architect['contextValues']
      ): string | undefined => {
        if (!contextValues) {
          return;
        }

        if (schema['x-dropdown'] === 'projects') {
          return contextValues['projectName'];
        } else if (hasKey(contextValues, schema.name)) {
          return contextValues[schema.name];
        } else {
          return undefined;
        }
      };

      taskExecForm.addControl(
        schema.name,
        new UntypedFormControl(
          contextDefaultValue(schema, architect.contextValues) ||
            defaultValues[schema.name],
          validators
        )
      );
    });

    return taskExecForm;
  }

  setConfiguration(
    taskExecForm: UntypedFormGroup,
    architect: TaskExecutionSchema,
    configurationName?: string
  ) {
    const defaultValues = this.getDefaultValuesForConfiguration(
      architect,
      configurationName
    );
    taskExecForm.patchValue(defaultValues);
    this.scrollToTop();
  }

  private scrollToTop() {
    this._scrollContainer?.nativeElement.scrollTo({
      top: 0,
    });
  }

  private focusFirstElement() {
    retry(2, 50, () => {
      const element = document
        .querySelector('nx-console-field')
        ?.querySelector('input, select, div[role="checkbox"]') as HTMLElement;
      element?.focus();
      return !!element;
    });
  }

  private setupActiveFieldTracking() {
    if (!this._scrollContainer || !this._formHeaderContainer) {
      return;
    }
    this.ngZone.runOutsideAngular(() => {
      const scrollElement = this._scrollContainer.nativeElement;
      const formHeaderElement = this._formHeaderContainer.nativeElement;
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
          scrollElement.querySelectorAll<HTMLElement>('nx-console-field')
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

  private getDefaultValuesForConfiguration(
    architect: TaskExecutionSchema,
    configurationName?: string
  ) {
    const defaultValues: { [key: string]: string | string[] } = {};
    architect.options.forEach((field) => {
      if (field.default === undefined || field.default === null) {
        defaultValues[field.name] = '';
        return;
      }
      if (Array.isArray(field.default)) {
        defaultValues[field.name] = field.default.map((item) => String(item));
      } else {
        defaultValues[field.name] =
          String(field.default) ||
          (field.type === OptionType.Boolean ? 'false' : '');
      }
    });

    if (configurationName && architect.configurations) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const configuration = architect.configurations.find(
        (c) => c.name === configurationName
      )!;

      configuration.defaultValues.forEach((value) => {
        defaultValues[value.name] = value.defaultValue || '';
      });
    }

    return defaultValues;
  }

  runCommand({ form, architect }: TaskExecutionForm, dryRun = false) {
    const configuration = form.get('configuration')?.value;
    const args = this.serializeArgs(form.value, architect, configuration);
    const flags = configuration
      ? [getConfigurationFlag(configuration), ...args]
      : args;
    if (architect.command === 'generate') {
      flags.push('--no-interactive');
    }
    if (dryRun) {
      flags.push('--dry-run');
    }

    this.ideCommunicationService.postMessageToIde(
      new TaskExecutionRunCommandOutputMessage({
        command: surroundWithQuotesIfHasWhiteSpace(architect.command),
        positional: surroundWithQuotesIfHasWhiteSpace(architect.positional),
        flags,
      })
    );
  }

  getValidFields$(
    valid: boolean
  ): Observable<{ [name: string]: string[] | string | number | boolean }> {
    return this.taskExecForm$.pipe(
      mergeMap((taskExecForm) =>
        merge(
          taskExecForm.form.valueChanges,
          taskExecForm.form.statusChanges
        ).pipe(
          startWith(taskExecForm),
          map(() => taskExecForm)
        )
      ),
      withLatestFrom(this.defaultValues$),
      map(([{ form, architect }, defaultValues]) => {
        return architect.options
          .filter((option) => {
            const control = form.controls[option.name];
            return (
              // ** VALID fields **
              (valid &&
                control.valid &&
                // touched is not working with checkbox, so ignore touched and just check !== defaultValue
                // control.touched &&
                ((option.type !== OptionType.Array &&
                  control.value !== defaultValues[option.name]) ||
                  (option.type === OptionType.Array &&
                    control.value &&
                    control.value.join(',') !==
                      ((defaultValues[option.name] || []) as string[]).join(
                        ','
                      )))) ||
              // ** INVALID fields **
              // invalid and touched (checkbox is always valid as true/false)
              (!valid && control.touched && control.invalid)
            );
          })
          .reduce(
            (options, option) => ({
              ...options,
              [option.name]: form.controls[option.name].value,
            }),
            {}
          );
      })
    );
  }

  private serializeArgs(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: { [p: string]: any },
    architect: TaskExecutionSchema,
    configurationName?: string
  ): string[] {
    const fields = architect.options
      .filter((s) => value[s.name])
      .sort((a, b) => (a?.positional ?? 0) - (b?.positional ?? 0));

    const defaultValues = this.getDefaultValuesForConfiguration(
      architect,
      configurationName
    );

    const args: Set<string> = new Set();
    fields.forEach((f) => {
      if (defaultValues[f.name] === value[f.name]) return;
      if (!defaultValues[f.name] && !value[f.name]) return;
      if (
        Array.isArray(defaultValues[f.name]) &&
        (defaultValues[f.name] as string[]).join(',') ===
          value[f.name].join(',')
      )
        return;

      if (f.positional !== undefined && typeof f.positional === 'number') {
        // Only add positional arguments for the first positional. Then add the rest of the positions as explicit flags
        if (f.positional === 0) {
          args.add(sanitizeWhitespace(value[f.name]));
        } else {
          args.add(`--${f.name}=${sanitizeWhitespace(value[f.name])}`);
        }
      } else if (f.type === OptionType.Boolean) {
        args.add(value[f.name] === 'false' ? `--no-${f.name}` : `--${f.name}`);
      } else {
        const fieldValue = value[f.name];
        if (Array.isArray(fieldValue)) {
          const values = fieldValue.map((v) => sanitizeWhitespace(v));
          args.add(`--${f.name}=${values.join(',')}`);
        } else {
          args.add(`--${f.name}=${sanitizeWhitespace(fieldValue)}`);
        }
      }
    });
    return Array.from(args);
  }

  copyCommandToClipboard(
    form: UntypedFormGroup,
    architect: TaskExecutionSchema
  ) {
    const configuration = form.get('configuration')?.value;
    this.clipboard.copy(
      `${formatTask(architect, configuration)} ${this.serializeArgs(
        form.value,
        architect,
        configuration
      ).join(' ')}`
    );
  }
}

function sanitizeWhitespace(value: string) {
  const trimmed = value.trim();
  return /\s/.test(trimmed) ? `'${trimmed}'` : trimmed; // NOTE: We use ' rather than " for powershell compatibility
}

function surroundWithQuotesIfHasWhiteSpace(target: string): string {
  if (target.match(/\s/g)) {
    return `"${target}"`;
  }
  return target;
}

function retry(remaining: number, waitFor: number, fn: () => boolean) {
  setTimeout(() => {
    const success = fn();
    if (!success && remaining > 0) {
      retry(remaining - 1, waitFor, fn);
    }
  }, waitFor);
}
