import { Completions, Serializer } from '@angular-console/utils';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  ViewChildren,
  ViewEncapsulation
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatExpansionPanel } from '@angular/material';
import { ReplaySubject, Subscription } from 'rxjs';
import { startWith } from 'rxjs/operators';

import { schematicFieldsToFormGroup } from '../schematic-fields/schematic-fields.component';
import { Schema } from '@angular-console/schema';

interface FieldGrouping {
  type: 'important' | 'optional';
  fields: Array<Schema>;
  expanded: boolean;
}

@Component({
  selector: 'ui-flags',
  templateUrl: './flags.component.html',
  styleUrls: ['./flags.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlagsComponent {
  private _rawFields: Schema[];
  private _fields: Schema[];
  private subscription: Subscription;

  @ViewChildren(CdkVirtualScrollViewport, { read: ElementRef })
  virtualScrollViewport: QueryList<ElementRef>;
  @ViewChildren(MatExpansionPanel)
  matExpansionPanels: QueryList<MatExpansionPanel>;

  fieldGroups: Array<FieldGrouping> = [];

  @Input() path: string;
  @Input() options: { defaultValues: { name: string; defaultValue: string }[] };
  @Input() configurations: {
    name: string;
    defaultValues: { name: string; defaultValue: string }[];
  }[];
  @Input() prefix: string[];
  @Input() init: { [k: string]: any };
  @Input() runSyntax = false;

  @Input()
  get fields() {
    return this._fields;
  }
  set fields(f: Schema[]) {
    this._rawFields = f;
    this.createFormUsingConfiguration(null);
  }

  @Output() readonly value = new EventEmitter();
  @Output() readonly action = new EventEmitter();

  formGroup: FormGroup;

  constructor(
    private readonly serializer: Serializer,
    private readonly elementRef: ElementRef,
    private readonly completions: Completions
  ) {}

  hideFields() {
    this.matExpansionPanels.forEach((panel: MatExpansionPanel) => {
      panel.close();
    });
  }

  viewportHeight = new ReplaySubject<string>();

  private toFieldGroups(fields: Array<Schema>): Array<FieldGrouping> {
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

  private setForm(configuration: string | null) {
    this.formGroup = schematicFieldsToFormGroup({
      fields: this._fields,
      configurations: this.configurations && this.configurations.length > 0,
      init: this.init,
      getCompletions: (f, v) =>
        this.completions.completionsFor(this.path, f, v || ''),
      selectedConfiguration: configuration
    });

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
    if (this.runSyntax) {
      const configuration =
        this.configurations && value.configurations
          ? `:${value.configurations}`
          : ``;

      this.value.next({
        commands: [
          this.prefix[0],
          `${this.prefix[1]}${configuration}`,
          ...this.serializer.serializeArgs(value, this._fields)
        ],
        valid: this.formGroup.valid
      });
    } else {
      const configuration =
        this.configurations && value.configurations
          ? [`--configuration=${value.configurations}`]
          : [];
      this.value.next({
        commands: [
          ...this.prefix,
          ...configuration,
          ...this.serializer.serializeArgs(value, this._fields)
        ],
        valid: this.formGroup.valid
      });
    }

    const e = this.elementRef.nativeElement;
    if (e.scrollTo) {
      e.scrollTo({
        top: 0,
        behavior: 'instant'
      });
    }
  }

  createFormUsingConfiguration(configuration: string | null) {
    this._fields = this.withConfigurationValues(configuration, this._rawFields);

    this.fieldGroups = this.toFieldGroups(this._fields);
    this.setForm(configuration);
  }

  private withConfigurationValues(configuration: string | null, f: Schema[]) {
    const selectedConfiguration =
      this.configurations &&
      this.configurations.find(c => c.name === configuration);
    const selectedOptions = selectedConfiguration
      ? selectedConfiguration
      : this.options;
    return f.map(ff => {
      const defaultFromOptions =
        selectedOptions &&
        selectedOptions.defaultValues.find(v => v.name === ff.name);
      if (defaultFromOptions) {
        const defaultValue = this.serializer.normalizeDefaultValue(
          ff.type,
          defaultFromOptions.defaultValue
        );
        return { ...ff, defaultValue };
      } else {
        return ff;
      }
    });
  }
}
