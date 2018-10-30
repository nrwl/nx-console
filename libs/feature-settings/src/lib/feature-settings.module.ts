import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Route } from '@angular/router';
import {
  MatFormFieldModule,
  MatSlideToggleModule,
  MatListModule,
  MatInputModule
} from '@angular/material';
import { SettingsComponent } from './settings/settings.component';

export const settingsRoutes: Route[] = [
  {
    path: '',
    component: SettingsComponent
  }
];
@NgModule({
  imports: [
    CommonModule,
    FlexLayoutModule,
    MatSlideToggleModule,
    MatInputModule,
    MatListModule,
    MatFormFieldModule,
    ReactiveFormsModule
  ],
  declarations: [SettingsComponent],
  exports: [SettingsComponent]
})
export class FeatureSettingsModule {}
