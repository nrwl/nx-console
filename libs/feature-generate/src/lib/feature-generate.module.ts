import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchematicsComponent } from './schematics/schematics.component';
import { Route, RouterModule } from '@angular/router';
import { SchematicComponent } from './schematic/schematic.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { UiModule } from '@nxui/ui';
import {
  MatListModule,
  MatOptionModule,
  MatIconModule
} from '@angular/material';
import { FlexLayoutModule } from '@angular/flex-layout';

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
    FormsModule,
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
