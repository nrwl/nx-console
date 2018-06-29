import { Component } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { map, switchMap, filter, startWith } from 'rxjs/operators';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';
import { ROUTING_ANIMATION } from './workspace.component.animations';
import { CommandRunner } from '@nxui/utils';

interface Route {
  icon: string;
  url: string;
  title: string;
}

@Component({
  selector: 'nxui-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.scss'],
  animations: [ROUTING_ANIMATION]
})
export class WorkspaceComponent {
  activeRouteTitle$: Observable<string> = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    map((event: NavigationEnd) => event.url),
    startWith(this.router.url),
    map(
      (url: string) =>
        (this.routes as any).find(route => url.indexOf(route.url) > -1).title
    )
  );

  readonly routes: Array<Route> = [
    { icon: 'details', url: 'details', title: 'Details' },
    { icon: 'create_new_folder', url: 'generate', title: 'Generate' },
    { icon: 'extension', url: 'extensions', title: 'CLI Extensions' },
    { icon: 'chevron_right', url: 'tasks', title: 'Tasks' }
  ];

  workspaceName$ = this.route.params.pipe(
    map(m => m['path']),
    switchMap(path => {
      return this.apollo.watchQuery({
        pollInterval: 2000,
        query: gql`
          query($path: String!) {
            workspace(path: $path) {
              name
            }
          }
        `,
        variables: {
          path
        }
      }).valueChanges;
    }),
    map((r: any) => r.data.workspace.name)
  );

  constructor(
    private readonly apollo: Apollo,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    readonly commandRunner: CommandRunner
  ) {}
}
