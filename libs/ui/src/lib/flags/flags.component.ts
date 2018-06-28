import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { Field, Serializer } from '@nxui/utils';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { startWith } from 'rxjs/operators';

@Component({
  selector: 'ui-flags',
  templateUrl: './flags.component.html',
  styleUrls: ['./flags.component.css']
})
export class FlagsComponent {
  private _fields: Field[];
  private subscription: Subscription;

  @Input() actionLabel: string;
  @Input() configurations: { name: string }[];
  @Input() prefix: string[];
  @Input()
  get fields() {
    return this._fields;
  }
  set fields(f: Field[]) {
    this._fields = f;
    this.setForm();
  }

  @Output() value = new EventEmitter();
  @Output() action = new EventEmitter();
  @Output() stop = new EventEmitter();

  formGroup: FormGroup;

  constructor(private readonly serializer: Serializer) {}

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

  private setForm() {
    const children = this._fields.reduce((m, f) => {
      m[f.name] = new FormControl(
        f.defaultValue,
        f.required ? Validators.required : null
      );
      return m;
    }, {});
    if (this.configurations && this.configurations.length > 0) {
      children['configurations'] = new FormControl(null, Validators.required);
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

  private emitNext(value: string[]) {
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
  }
}
