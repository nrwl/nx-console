import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { UiModule } from '@angular-console/ui';

import { ExtensionsComponent } from './extensions/extensions.component';
import { ExtensionComponent } from './extension/extension.component';
import {
  MatIconModule,
  MatListModule,
  MatOptionModule
} from '@angular/material';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';

export const extensionsRoutes: Route[] = [
  {
    path: '',
    component: ExtensionsComponent,
    children: [
      {
        path: ':name',
        component: ExtensionComponent
      },
      {
        path: '',
        component: ExtensionComponent
      }
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
  declarations: [ExtensionsComponent, ExtensionComponent]
})
export class FeatureExtensionsModule {}
