import { Component } from '@angular/core';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

import { Router } from '@angular/router';
import { Messenger, Settings } from '@nxui/utils';

@Component({
  selector: 'nxui-workspaces',
  templateUrl: './workspaces.component.html',
  styleUrls: ['./workspaces.component.css']
})
export class WorkspacesComponent {
  constructor(
    private apollo: Apollo,
    private messenger: Messenger,
    private router: Router,
    public settings: Settings,
  ) {}

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
        r => {
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
