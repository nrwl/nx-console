import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutocompleteComponent } from './autocomplete/autocomplete.component';
import { SelectComponent } from './select/select.component';
import { InputComponent } from './input/input.component';
import { CheckboxComponent } from './checkbox/checkbox.component';
import { FieldComponent } from './field/field.component';
import { FieldTreeComponent } from './field-tree/field-tree.component';

@NgModule({
  imports: [CommonModule],
  declarations: [
    AutocompleteComponent,
    SelectComponent,
    InputComponent,
    CheckboxComponent,
    FieldComponent,
    FieldTreeComponent
  ],
  exports: [
    AutocompleteComponent,
    SelectComponent,
    InputComponent,
    CheckboxComponent,
    FieldComponent,
    FieldTreeComponent
  ]
})
export class VscodeUiComponentsModule {}
