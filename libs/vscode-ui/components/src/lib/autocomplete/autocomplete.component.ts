import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { Schema } from '@angular-console/schema';

/**
 * Not built yet - using a datalist temporarily to loosely mimic functionality
 */

@Component({
  selector: 'angular-console-autocomplete',
  templateUrl: './autocomplete.component.html',
  styleUrls: ['./autocomplete.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AutocompleteComponent {
  @Input() field: Schema;
}
