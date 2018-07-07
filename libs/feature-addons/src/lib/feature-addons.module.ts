import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { UiModule } from '@nxui/ui';

import { AddonsComponent } from './addons/addons.component';

export const addonsRoutes: Route[] = [{ path: '', component: AddonsComponent }];

@NgModule({
  imports: [CommonModule, RouterModule, UiModule],
  declarations: [AddonsComponent]
})
export class FeatureAddonsModule {}
