import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ContextualActionBarService } from '@nxui/ui';
import { Messenger, Settings } from '@nxui/utils';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

@Component({
  selector: 'nxui-workspaces',
  templateUrl: './workspaces.component.html',
  styleUrls: ['./workspaces.component.css']
})
export class WorkspacesComponent {
  constructor(
    private readonly apollo: Apollo,
    private readonly messenger: Messenger,
    private readonly router: Router,
    public readonly settings: Settings,
    contextualActionBarService: ContextualActionBarService
  ) {
    contextualActionBarService.breadcrumbs$.next([
      { title: 'Choose A Workspace' }
    ]);
  }

  openWorkspace(path: string) {
    // this query is just a smoke check
    this.apollo
      .query({
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
      })
      .subscribe(
        () => {
          this.router.navigate(['/workspaces', path]);
        },
        e => {
          this.messenger.error(e);
        }
      );
  }

  clearRecent() {
    this.settings.clear();
  }
}
