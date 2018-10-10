import { NgModule } from '@angular/core';
import { ActionBarComponent } from './action-bar.component';
import { UiModule } from '@angular-console/ui';

@NgModule({
  imports: [UiModule],
  exports: [ActionBarComponent],
  declarations: [ActionBarComponent]
})
export class FeatureActionBarModule {}
