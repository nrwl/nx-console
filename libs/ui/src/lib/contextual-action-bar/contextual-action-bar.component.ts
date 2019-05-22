import { ENVIRONMENT, Environment } from '@angular-console/environment';
import { CommandRunner, Messenger } from '@angular-console/utils';
import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
  ContextualActionBarService,
  ContextualTab
} from '@nrwl/angular-console-enterprise-frontend';
import { ReplaySubject } from 'rxjs';
import { filter, map, shareReplay } from 'rxjs/operators';

export const CONTEXTUAL_ACTION_BAR_HEIGHT = 52;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ui-contextual-action-bar',
  templateUrl: './contextual-action-bar.component.html',
  styleUrls: ['./contextual-action-bar.component.scss'],
  animations: [
    trigger('fadeIn', [
      state('void', style({ opacity: 0 })),
      state('*', style({ opacity: 1 })),
      transition(`:enter`, animate(`300ms cubic-bezier(0.4, 0.0, 0.2, 1)`))
    ]),
    trigger('growShrink', [
      state('void', style({ height: 0 })),
      state('*', style({ height: '*' })),
      transition(`* <=> *`, animate(`300ms cubic-bezier(0.4, 0.0, 0.2, 1)`))
    ])
  ]
})
export class ContextualActionBarComponent {
  showMenuButton = new ReplaySubject<boolean>();

  readonly isElectron = this.environment.application === 'electron';

  readonly contextualActions$ = this.contextualActionBarService.contextualActions$.pipe(
    shareReplay(1)
  );

  constructor(
    @Inject(ENVIRONMENT) readonly environment: Environment,
    readonly contextualActionBarService: ContextualActionBarService,
    readonly commandRunner: CommandRunner,
    readonly messenger: Messenger,
    readonly router: Router
  ) {
    router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map(e => e.urlAfterRedirects)
      )
      .subscribe(url => {
        this.showMenuButton.next(url !== '/workspaces');
      });
  }

  trackByName(_: number, tab: ContextualTab) {
    return tab.name;
  }

  stopCommand() {
    this.commandRunner.stopActiveCommand();
    this.messenger.notify('Command has been canceled');
  }
}
