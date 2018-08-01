import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ContextualActionBarComponent } from './contextual-action-bar/contextual-action-bar.component';
import { ContextualActionBarService } from './contextual-action-bar/contextual-action-bar.service';
import { DirectorySelectorComponent } from './directory-selector/directory-selector.component';
import { FlagsComponent } from './flags/flags.component';
import { TaskRunnerComponent } from './task-runner/task-runner.component';
import { TaskSelectorComponent } from './task-selector/task-selector.component';
import { TerminalComponent } from './terminal/terminal.component';

import { CdkTreeModule } from '@angular/cdk/tree';
import { FlexLayoutModule } from '@angular/flex-layout';
import {
  MatAutocompleteModule,
  MatButtonModule,
  MatCardModule,
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
  MatSidenavModule,
  MatSlideToggleModule,
  MatTabsModule,
  MatToolbarModule,
  MatTooltipModule,
  MatTreeModule
} from '@angular/material';
import { NormalizePathPipe } from './normalize-path.pipe';

const IMPORTS = [
  CdkTreeModule,
  CommonModule,
  FlexLayoutModule,
  MatAutocompleteModule,
  MatButtonModule,
  MatCardModule,
  MatDividerModule,
  MatExpansionModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatOptionModule,
  MatRadioModule,
  MatRippleModule,
  MatSelectModule,
  MatSidenavModule,
  MatSlideToggleModule,
  MatTabsModule,
  MatToolbarModule,
  MatTooltipModule,
  MatTreeModule,
  CdkTreeModule,
  MatAutocompleteModule,
  MatButtonModule,
  MatCardModule,
  MatDividerModule,
  MatExpansionModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatOptionModule,
  MatRadioModule,
  MatRippleModule,
  MatSelectModule,
  MatSidenavModule,
  MatSlideToggleModule,
  MatTabsModule,
  MatToolbarModule,
  MatTooltipModule,
  MatTreeModule,
  ReactiveFormsModule,
  RouterModule
];

@NgModule({
  imports: IMPORTS,
  declarations: [
    FlagsComponent,
    TerminalComponent,
    TaskRunnerComponent,
    TaskSelectorComponent,
    ContextualActionBarComponent,
    DirectorySelectorComponent,
    NormalizePathPipe
  ],
  providers: [ContextualActionBarService],
  exports: [
    ...IMPORTS,
    ContextualActionBarComponent,
    DirectorySelectorComponent,
    FlagsComponent,
    TaskRunnerComponent,
    TaskSelectorComponent,
    TerminalComponent,
    NormalizePathPipe
  ]
})
export class UiModule {
  constructor(
    private readonly matIconRegistry: MatIconRegistry,
    private readonly domSanitizer: DomSanitizer
  ) {
    this.addIcon('toggle_on', 'baseline-toggle_on-24px.svg');
    this.addIcon('toggle_off', 'baseline-toggle_off-24px.svg');
    this.addIcon('finder', 'finder.svg');
    this.addIcon('explorer', 'explorer.svg');
    this.addIcon('vscode', 'vscode.svg');
    this.addIcon('webstorm', 'webstorm.svg');
    this.addIcon('intellij', 'intellij.svg');
  }

  private addIcon(name: string, url: string) {
    this.matIconRegistry.addSvgIcon(
      name,
      this.domSanitizer.bypassSecurityTrustResourceUrl(`assets/${url}`)
    );
  }
}
