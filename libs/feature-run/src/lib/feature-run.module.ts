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
import { UiModule } from '@nxui/ui';

import { TargetComponent } from './target/target.component';
import { TargetsComponent } from './targets/targets.component';
import { NpmScriptComponent } from './npmscript/npmscript.component';

export const runRoutes: Route[] = [
  {
    path: '',
    component: TargetsComponent,
    children: [
      { path: 'script/:script', component: NpmScriptComponent },
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
  declarations: [TargetsComponent, TargetComponent, NpmScriptComponent]
})
export class FeatureRunModule {}
