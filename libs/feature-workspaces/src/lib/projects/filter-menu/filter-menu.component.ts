import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'apollo-link';

export interface FilterMenuLink {
  displayText: string;
  link?: any; // Optional to indicate section header
}

@Component({
  selector: 'angular-console-filter-menu',
  templateUrl: './filter-menu.component.html',
  styleUrls: ['./filter-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterMenuComponent {
  @Input() filterFormControl: FormControl;
  @Input() links$: Observable<FilterMenuLink[]>;
}
