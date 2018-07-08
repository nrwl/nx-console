import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Completions, Field, Serializer } from '@nxui/utils';
import { Subscription } from 'rxjs';
import { debounceTime, startWith, switchMap } from 'rxjs/operators';

interface FieldGrouping {
  type: 'important' | 'optional';
  fields: Array<Field>;
  expanded: boolean;
}

@Component({
  selector: 'ui-flags',
  templateUrl: './flags.component.html',
  styleUrls: ['./flags.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: 0 })),
      state('*', style({ opacity: 1 })),
      transition(`:enter`, animate(`150ms ease-in-out`)),
      transition(`:leave`, animate(`150ms ease-in-out`))
    ])
  ]
})
export class FlagsComponent {
  private _fields: Field[];
  private subscription: Subscription;

  fieldGroups: Array<FieldGrouping> = [];

  @Input() path: string;
  @Input() description: string;
  @Input() actionLabel: string;
  @Input() configurations: { name: string }[];
  @Input() prefix: string[];
  @Input() init: { [k: string]: any };
  @Input()
  get fields() {
    return this._fields;
  }
  set fields(f: Field[]) {
    this._fields = f;
    this.fieldGroups = this.toFieldGroups(f);
    this.setForm();
  }

  @Output() readonly value = new EventEmitter();
  @Output() readonly action = new EventEmitter();
  @Output() readonly stop = new EventEmitter();

  formGroup: FormGroup;

  constructor(
    private readonly serializer: Serializer,
    private readonly elementRef: ElementRef,
    private readonly completions: Completions
  ) {}

  fieldOptions(field: Field) {
    if (field.defaultValue) {
      return field.enum;
    } else {
      return [null, ...field.enum];
    }
  }

  fieldOption(value: any) {
    return value === null ? '--' : value;
  }

  onSubmit() {
    this.action.next();
  }

  onReset() {
    this.setForm();
  }

  onStop() {
    this.stop.next();
  }

  clearFormField(f: Field) {
    const formControl = this.formGroup.get(f.name);
    if (formControl) {
      formControl.reset();
    }
  }

  toggleBooleanField(f: Field) {
    const formControl = this.formGroup.get(f.name);
    if (formControl) {
      formControl.setValue(!formControl.value);
    }
  }

  private toFieldGroups(fields: Array<Field>): Array<FieldGrouping> {
    const importantFields: FieldGrouping = {
      type: 'important',
      fields: fields.filter(f => f.important),
      expanded: true
    };

    const optionalFields: FieldGrouping = {
      type: 'optional',
      fields: fields.filter(f => !f.important),
      expanded: false
    };

    if (importantFields.fields.length) {
      const groupings: Array<FieldGrouping> = [importantFields];

      if (optionalFields.fields.length) {
        groupings.push(optionalFields);
      }

      return groupings;
    } else {
      return [
        {
          ...importantFields,
          fields
        }
      ];
    }
  }

  private setForm() {
    const children = this._fields.reduce(
      (m, f) => {
        const value =
          this.init && this.init[f.name] ? this.init[f.name] : f.defaultValue;
        m[f.name] = new FormControl(
          value,
          f.required ? Validators.required : null
        );

        // TODO: DAN remove this and replace with real UI
        if (f.completion) {
          m[f.name].valueChanges
            .pipe(
              debounceTime(100),
              switchMap((v: string) =>
                this.completions.completionsFor(this.path, f, v)
              )
            )
            .subscribe((v: string[]) => {
              console.log('completions for', f.name, v);
            });
        }

        return m;
      },
      {} as any
    );
    if (this.configurations && this.configurations.length > 0) {
      children['configurations'] = new FormControl(null);
    }
    this.formGroup = new FormGroup(children);

    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.subscription = this.formGroup.valueChanges
      .pipe(startWith(this.formGroup.value))
      .subscribe(value => {
        this.emitNext(value);
      });
  }

  private emitNext(value: { [p: string]: any }) {
    const configuration =
      this.configurations && value['configurations']
        ? [`--configuration=${value['configurations']}`]
        : [];
    this.value.next({
      commands: [
        ...this.prefix,
        ...configuration,
        ...this.serializer.serializeArgs(value, this._fields)
      ],
      valid: this.formGroup.valid
    });
    (this.elementRef.nativeElement as HTMLElement).scrollTo({
      top: 0,
      behavior: 'instant'
    });
  }
}
