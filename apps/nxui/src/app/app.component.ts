import { transition, trigger } from '@angular/animations';
import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
  animateLeft,
  animateRight,
  ContextualActionBarService
} from '@nxui/ui';
import { filter } from 'rxjs/operators';

const TIMING = '500ms ease-in-out';
const ANIMATE_LEFT = animateLeft(TIMING);
const ANIMATE_RIGHT = animateRight(TIMING);

@Component({
  selector: 'nxui-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  animations: [
    trigger('routerTransition', [
      transition('void => *', []),
      transition('create-workspace => workspaces', ANIMATE_LEFT),
      transition('import-workspace => workspaces', ANIMATE_LEFT),
      transition('import-workspace => create-workspace', ANIMATE_LEFT),
      transition('workspaces => create-workspace', ANIMATE_RIGHT),
      transition('workspaces => import-workspace', ANIMATE_RIGHT),
      transition('create-workspace => import-workspace', ANIMATE_RIGHT)
    ])
  ]
})
export class AppComponent {
  constructor(
    router: Router,
    contextualActionBarService: ContextualActionBarService
  ) {
    router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event => {
        const navigationEnd = event as NavigationEnd;
        if (navigationEnd.url.startsWith('/workspace/')) {
          contextualActionBarService.contextualTabs$.next(null);
        } else {
          contextualActionBarService.breadcrumbs$.next([
            { title: 'Choose A Workspace' }
          ]);

          contextualActionBarService.contextualTabs$.next({
            tabs: [
              {
                icon: 'view_list',
                name: 'Recent',
                routerLink: '/workspaces'
              },
              {
                icon: 'create_new_folder',
                name: 'Create',
                routerLink: '/create-workspace'
              },
              {
                icon: 'folder_open',
                name: 'Import',
                routerLink: '/import-workspace'
              }
            ]
          });
        }
      });
  }
}
