import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { AutocompleteComponent } from './autocomplete/autocomplete.component';
import { CheckboxComponent } from './checkbox/checkbox.component';
import { FieldComponent } from './field/field.component';
import { FieldItemsPipe } from './field-items/field-items.pipe';
import { FieldTreeComponent } from './field-tree/field-tree.component';
import { InputComponent } from './input/input.component';
import { MultipleSelectComponent } from './multiple-select/multiple-select.component';
import { SelectComponent } from './select/select.component';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule],
  declarations: [
    AutocompleteComponent,
    SelectComponent,
    InputComponent,
    CheckboxComponent,
    FieldComponent,
    FieldTreeComponent,
    MultipleSelectComponent,
    FieldItemsPipe,
  ],
  exports: [
    AutocompleteComponent,
    SelectComponent,
    InputComponent,
    CheckboxComponent,
    FieldComponent,
    FieldTreeComponent,
    MultipleSelectComponent,
  ],
})
export class VscodeUiComponentsModule {}
