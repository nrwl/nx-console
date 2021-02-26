import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AutocompleteComponent } from './autocomplete/autocomplete.component';
import { SelectComponent } from './select/select.component';
import { InputComponent } from './input/input.component';
import { CheckboxComponent } from './checkbox/checkbox.component';
import { FieldComponent } from './field/field.component';
import { FieldTreeComponent } from './field-tree/field-tree.component';
import { MultipleSelectComponent } from './multiple-select/multiple-select.component';
import { FormatTaskPipe } from './format-task/format-task.pipe';

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
    FormatTaskPipe,
  ],
  exports: [
    AutocompleteComponent,
    SelectComponent,
    InputComponent,
    CheckboxComponent,
    FieldComponent,
    FieldTreeComponent,
    MultipleSelectComponent,
    FormatTaskPipe,
  ],
})
export class VscodeUiComponentsModule {}
