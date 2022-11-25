import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ArgumentListComponent } from './argument-list.component';

@NgModule({
  imports: [CommonModule],
  declarations: [ArgumentListComponent],
  exports: [ArgumentListComponent],
})
export class ArgumentListModule {}
