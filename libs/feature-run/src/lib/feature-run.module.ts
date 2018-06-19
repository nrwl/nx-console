import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TargetsComponent } from './targets/targets.component';
import { Route, RouterModule } from '@angular/router';
import { TargetComponent } from './target/target.component';
import { ReactiveFormsModule } from '@angular/forms';
import { UiModule } from '@nxui/ui';

export const runRoutes: Route[] = [
  { path: '', component: TargetsComponent },
  { path: ':targetName/:projectName', component: TargetComponent },
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    UiModule
  ],
  declarations: [TargetsComponent, TargetComponent]
})
export class FeatureRunModule {
}
