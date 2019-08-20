import { ScrollingModule } from '@angular/cdk/scrolling';
import { CdkTreeModule } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
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
  MatGridListModule,
  MatIconModule,
  MatIconRegistry,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatOptionModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatRadioModule,
  MatRippleModule,
  MatSelectModule,
  MatSidenavModule,
  MatSlideToggleModule,
  MatStepperModule,
  MatTabsModule,
  MatToolbarModule,
  MatTooltipModule,
  MatTreeModule
} from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import { BuildStatusComponent } from './build-status/build-status.component';
import { CommandOutputComponent } from './command-output/command-output.component';
import { ContextualActionBarComponent } from './contextual-action-bar/contextual-action-bar.component';
import { DataCollectionComponent } from './data-collection/data-collection.component';
import { EntityDocsComponent } from './entity-docs/entity-docs.component';
import { FlagsComponent } from './flags/flags.component';
import { FormatFileSizePipe } from './format-file-size.pipe';
import { ModulesGraphComponent } from './modules-graph/modules-graph.component';
import { NormalizePathPipe } from './normalize-path.pipe';
import { SchematicFieldsComponent } from './schematic-fields/schematic-fields.component';
import { TaskRunnerComponent } from './task-runner/task-runner.component';
import { TaskSelectorComponent } from './task-selector/task-selector.component';
import { TerminalComponent } from './terminal/terminal.component';
import { TerminalFactory } from './terminal/terminal.factory';

const IMPORTS = [
  HttpClientModule,
  ScrollingModule,
  CdkTreeModule,
  CommonModule,
  FlexLayoutModule,
  MatAutocompleteModule,
  MatBadgeModule,
  MatButtonModule,
  MatCardModule,
  MatDividerModule,
  MatExpansionModule,
  MatGridListModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatOptionModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatRadioModule,
  MatRippleModule,
  MatSelectModule,
  MatSidenavModule,
  MatSlideToggleModule,
  MatStepperModule,
  MatTabsModule,
  MatToolbarModule,
  MatTooltipModule,
  MatTreeModule,
  ReactiveFormsModule,
  RouterModule
];

const PUBLIC_DECLARATIONS = [
  BuildStatusComponent,
  CommandOutputComponent,
  ContextualActionBarComponent,
  DataCollectionComponent,
  FlagsComponent,
  NormalizePathPipe,
  TaskRunnerComponent,
  TaskSelectorComponent,
  TerminalComponent,
  EntityDocsComponent
];

@NgModule({
  imports: IMPORTS,
  providers: [TerminalFactory, FormatFileSizePipe],
  declarations: [
    ...PUBLIC_DECLARATIONS,
    SchematicFieldsComponent,
    FormatFileSizePipe,
    ModulesGraphComponent
  ],
  exports: [
    ...IMPORTS,
    ...PUBLIC_DECLARATIONS,
    SchematicFieldsComponent,
    ModulesGraphComponent
  ]
})
export class UiModule {
  constructor(
    private readonly matIconRegistry: MatIconRegistry,
    private readonly domSanitizer: DomSanitizer
  ) {
    this.addIcon('toggle_on', 'baseline-toggle_on-24px.svg');
    this.addIcon('finder', 'finder.svg');
    this.addIcon('explorer', 'explorer.svg');
    this.addIcon('vscode', 'vscode.svg');
    this.addIcon('webstorm', 'webstorm.svg');
    this.addIcon('intellij', 'intellij.svg');
    this.addIcon('console', 'console.svg');
  }

  private addIcon(name: string, url: string) {
    this.matIconRegistry.addSvgIcon(
      name,
      this.domSanitizer.bypassSecurityTrustResourceUrl(`assets/${url}`)
    );
  }
}
