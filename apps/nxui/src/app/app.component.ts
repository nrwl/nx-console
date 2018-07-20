import { transition, trigger } from '@angular/animations';
import { Component, ViewChild, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import {
  animateLeft,
  animateRight,
  ContextualActionBarService,
  fadeIn
} from '@nxui/ui';
import { filter, map } from 'rxjs/operators';
import {
  CREATE_WORKSPACE,
  IMPORT_WORKSPACE,
  WORKSPACES,
  WORKSPACE
} from '@nxui/feature-workspaces';
import { Observable } from 'rxjs';

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
      transition(`${CREATE_WORKSPACE} => ${WORKSPACES}`, ANIMATE_LEFT),
      transition(`${IMPORT_WORKSPACE} => ${WORKSPACES}`, ANIMATE_LEFT),
      transition(`${IMPORT_WORKSPACE} => ${CREATE_WORKSPACE}`, ANIMATE_LEFT),
      transition(`${WORKSPACES} => ${CREATE_WORKSPACE}`, ANIMATE_RIGHT),
      transition(`${WORKSPACES} => ${IMPORT_WORKSPACE}`, ANIMATE_RIGHT),
      transition(`${CREATE_WORKSPACE} => ${IMPORT_WORKSPACE}`, ANIMATE_RIGHT),
      transition(`* <=> ${WORKSPACE}`, fadeIn(`500ms ease-in-out`))
    ])
  ]
})
export class AppComponent implements OnInit {
  @ViewChild(RouterOutlet) routerOutlet: RouterOutlet;
  routerTransition: Observable<string>;

  ngOnInit() {
    this.routerTransition = this.routerOutlet.activateEvents.pipe(
      map(() => this.routerOutlet.activatedRouteData.state)
    );
  }

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
