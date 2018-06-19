import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchematicsComponent } from './schematics/schematics.component';
import { Route, RouterModule } from '@angular/router';
import { SchematicComponent } from './schematic/schematic.component';
import { ReactiveFormsModule } from '@angular/forms';
import { UiModule } from '@nxui/ui';

export const generateRoutes: Route[] = [
  { path: '', pathMatch: 'full', component: SchematicsComponent },
  { path: ':collection/:schematic', component: SchematicComponent },
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    UiModule
  ],
  declarations: [SchematicsComponent, SchematicComponent]
})
export class FeatureGenerateModule {
}
