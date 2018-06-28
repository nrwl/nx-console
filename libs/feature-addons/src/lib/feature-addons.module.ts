import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { AddonsComponent } from './addons/addons.component';
import { UiModule } from '@nxui/ui';

export const addonsRoutes: Route[] = [{ path: '', component: AddonsComponent }];

@NgModule({
  imports: [CommonModule, RouterModule, UiModule],
  declarations: [AddonsComponent]
})
export class FeatureAddonsModule {}
