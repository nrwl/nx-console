import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { Field, Serializer } from '@nxui/utils';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'ui-flags',
  templateUrl: './flags.component.html',
  styleUrls: ['./flags.component.css']
})
export class FlagsComponent {
  _fields: Field[];
  _form: FormGroup;
  private subscription: Subscription;

  @Input() actionLabel: string;
  @Input() prefix: string[];
  @Input()
  set fields(f: Field[]) {
    this._fields = f;
    this.setForm();
  }

  @Output() value = new EventEmitter();
  @Output() action = new EventEmitter();
  @Output() stop = new EventEmitter();

  constructor(private serializer: Serializer) {
  }

  fieldOptions(field: Field) {
    if (field.enum) {
      return [null, ...field.enum];
    } else if (field.type === 'boolean') {
      return [null, false, true];
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
      m[f.name] = new FormControl(null, f.required ? Validators.required : null);
      return m;
    }, {});
    this._form = new FormGroup(children);

    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.subscription = this._form.valueChanges.subscribe(value => {
      this.emitNext(value);
    });
    this.emitNext(this._form.value);
  }

  private emitNext(value: string[]) {
    this.value.next({ commands: [...this.prefix, ...this.serializer.serializeArgs(value, this._fields)], valid: this._form.valid });
  }
}
