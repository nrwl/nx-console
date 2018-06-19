import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlagsComponent } from './flags/flags.component';
import { ReactiveFormsModule } from '@angular/forms';
import { TerminalComponent } from './terminal/terminal.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  declarations: [FlagsComponent, TerminalComponent],
  exports: [FlagsComponent, TerminalComponent]
})
export class UiModule {
}
