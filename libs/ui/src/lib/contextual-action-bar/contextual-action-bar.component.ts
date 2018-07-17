import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import { Component } from '@angular/core';
import {
  ContextualActionBarService,
  ContextualTab
} from './contextual-action-bar.service';

@Component({
  selector: 'ui-contextual-action-bar',
  templateUrl: './contextual-action-bar.component.html',
  styleUrls: ['./contextual-action-bar.component.scss'],
  animations: [
    trigger('fadeIn', [
      state('void', style({ opacity: 0 })),
      state('*', style({ opacity: 1 })),
      transition(`:enter`, animate(`500ms ease-in-out`))
    ])
  ]
})
export class ContextualActionBarComponent {
  constructor(
    readonly contextualActionBarService: ContextualActionBarService
  ) {}

  trackByName(_: number, tab: ContextualTab) {
    return tab.name;
  }
}
