import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import {
  MatIconModule,
  MatListModule,
  MatOptionModule
} from '@angular/material';
import { Route, RouterModule } from '@angular/router';
import { UiModule } from '@angular-console/ui';

import { SchematicComponent } from './schematic/schematic.component';
import { SchematicsComponent } from './schematics/schematics.component';

export const generateRoutes: Route[] = [
  {
    path: '',
    component: SchematicsComponent,
    children: [
      { path: ':collection/:schematic', component: SchematicComponent },
      { path: '', pathMatch: 'full', component: SchematicComponent }
    ]
  }
];

@NgModule({
  imports: [
    MatIconModule,
    MatListModule,
    FlexLayoutModule,
    MatOptionModule,
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    UiModule
  ],
  declarations: [SchematicsComponent, SchematicComponent]
})
export class FeatureGenerateModule {}
