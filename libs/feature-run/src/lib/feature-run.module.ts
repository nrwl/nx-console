import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TargetsComponent } from './targets/targets.component';
import { Route, RouterModule } from '@angular/router';
import { TargetComponent } from './target/target.component';
import { ReactiveFormsModule } from '@angular/forms';
import { UiModule } from '@nxui/ui';
import {
  MatIconModule,
  MatListModule,
  MatOptionModule
} from '@angular/material';
import { FlexLayoutModule } from '@angular/flex-layout';

export const runRoutes: Route[] = [
  {
    path: '',
    component: TargetsComponent,
    children: [
      { path: ':target/:project', component: TargetComponent },
      { path: '', pathMatch: 'full', component: TargetComponent }
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
  declarations: [TargetsComponent, TargetComponent]
})
export class FeatureRunModule {}
