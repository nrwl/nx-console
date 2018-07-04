import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatButtonModule,
  MatDividerModule,
  MatExpansionModule,
  MatIconModule,
  MatIconRegistry,
  MatInputModule,
  MatListModule,
  MatOptionModule,
  MatRadioModule,
  MatRippleModule,
  MatSelectModule,
  MatSlideToggleModule,
  MatToolbarModule,
  MatTooltipModule
} from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';
import { ContextualActionBarService } from '@nxui/ui/src/lib/contextual-action-bar/contextual-action-bar.service';

import { ContextualActionBarComponent } from './contextual-action-bar/contextual-action-bar.component';
import { FlagsComponent } from './flags/flags.component';
import { TaskRunnerComponent } from './task-runner/task-runner.component';
import { TaskSelectorComponent } from './task-selector/task-selector.component';
import { TerminalComponent } from './terminal/terminal.component';

@NgModule({
  imports: [
    CommonModule,
    FlexLayoutModule,
    MatIconModule,
    MatTooltipModule,
    MatToolbarModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDividerModule,
    MatExpansionModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatOptionModule,
    MatRadioModule,
    MatRippleModule,
    MatSelectModule,
    MatSlideToggleModule,
    ReactiveFormsModule
  ],
  declarations: [
    FlagsComponent,
    TerminalComponent,
    TaskRunnerComponent,
    TaskSelectorComponent,
    ContextualActionBarComponent
  ],
  providers: [ContextualActionBarService],
  exports: [
    ContextualActionBarComponent,
    FlagsComponent,
    TerminalComponent,
    TaskRunnerComponent,
    TaskSelectorComponent
  ]
})
export class UiModule {
  constructor(matIconRegistry: MatIconRegistry, domSanitizer: DomSanitizer) {
    matIconRegistry.addSvgIcon(
      'toggle_on',
      domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/baseline-toggle_on-24px.svg'
      )
    );
    matIconRegistry.addSvgIcon(
      'toggle_off',
      domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/baseline-toggle_off-24px.svg'
      )
    );
  }
}
