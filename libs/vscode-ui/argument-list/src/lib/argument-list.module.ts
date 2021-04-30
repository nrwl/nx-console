import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ArgumentListComponent } from './argument-list.component';

@NgModule({
  imports: [CommonModule],
  declarations: [ArgumentListComponent],
  exports: [ArgumentListComponent],
})
export class ArgumentListModule {}
