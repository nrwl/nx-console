import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { AddonsComponent } from './addons/addons.component';

export const addonsRoutes: Route[] = [
  { path: '', component: AddonsComponent },
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule
  ],
  declarations: [AddonsComponent]
})
export class FeatureAddonsModule {
}
