import { CdkTreeModule } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatBadgeModule,
  MatButtonModule,
  MatCardModule,
  MatDividerModule,
  MatExpansionModule,
  MatIconModule,
  MatIconRegistry,
  MatInputModule,
  MatListModule,
  MatMenuModule,
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
  MatProgressBarModule,
  MatProgressSpinnerModule
} from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import { ContextualActionBarComponent } from './contextual-action-bar/contextual-action-bar.component';
import { DataCollectionComponent } from './data-collection/data-collection.component';
import { DirectorySelectorComponent } from './directory-selector/directory-selector.component';
import { FlagsComponent } from './flags/flags.component';
import { NormalizePathPipe } from './normalize-path.pipe';
import { TaskRunnerComponent } from './task-runner/task-runner.component';
import { TaskSelectorComponent } from './task-selector/task-selector.component';
import { TerminalComponent } from './terminal/terminal.component';
import { BuildStatusComponent } from './build-status/build-status.component';
import { CommandOutputComponent } from './command-output/command-output.component';
import { TestStatusComponent } from './test-status/test-status.component';

const IMPORTS = [
  MatProgressSpinnerModule,
  MatProgressBarModule,
  MatMenuModule,
  CdkTreeModule,
  CommonModule,
  FlexLayoutModule,
  MatAutocompleteModule,
  MatBadgeModule,
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
  MatProgressSpinnerModule,
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
    NormalizePathPipe,
    DataCollectionComponent,
    BuildStatusComponent,
    CommandOutputComponent,
    TestStatusComponent
  ],
  exports: [
    ...IMPORTS,
    ContextualActionBarComponent,
    DirectorySelectorComponent,
    FlagsComponent,
    TaskRunnerComponent,
    TaskSelectorComponent,
    TerminalComponent,
    NormalizePathPipe,
    DataCollectionComponent,
    BuildStatusComponent,
    CommandOutputComponent,
    TestStatusComponent
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
    this.addIcon('terminal', 'terminal.svg');
    this.addIcon('console', 'console.svg');
  }

  private addIcon(name: string, url: string) {
    this.matIconRegistry.addSvgIcon(
      name,
      this.domSanitizer.bypassSecurityTrustResourceUrl(`assets/${url}`)
    );
  }
}
