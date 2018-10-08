import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';
import { filter, first, map, switchMap, takeWhile, tap } from 'rxjs/operators';
import { Messenger, Settings } from '@angular-console/utils';

@Component({
  selector: 'angular-console-install-node-js',
  templateUrl: './install-node-js.component.html',
  styleUrls: ['./install-node-js.component.scss']
})
export class InstallNodeJsComponent {
  installNodeJsStatus$?: Observable<boolean>;

  constructor(
    private readonly messenger: Messenger,
    private readonly apollo: Apollo,
    private readonly router: Router,
    private readonly settings: Settings
  ) {}

  installNodeJs() {
    this.installNodeJsStatus$ = this.apollo
      .mutate({
        mutation: gql`
          mutation {
            installNodeJs {
              cancelled
            }
          }
        `
      })
      .pipe(
        switchMap(() => {
          return this.apollo
            .watchQuery({
              pollInterval: 300,
              query: gql`
                query {
                  installNodeJsStatus {
                    downloadPercentage
                    downloadSpeed
                    success
                    cancelled
                    error
                  }
                }
              `
            })
            .valueChanges.pipe(
              map((result: any) => result.data.installNodeJsStatus)
            );
        }),
        tap(({ success, error }: any) => {
          if (success) {
            this.router.navigate(['/workspaces']);
          } else if (error) {
            this.messenger.error(error);
          }
        }),
        takeWhile(({ success, cancelled, error }: any) => {
          return Boolean(!success && !cancelled && !error);
        })
      );
  }

  installManually() {
    this.settings.setInstallManually(true);

    // wait for the settings to update
    this.apollo
      .watchQuery({
        query: gql`
          query {
            isNodejsInstalled {
              result
            }
          }
        `
      })
      .valueChanges.pipe(
        filter((v: any) => v.data.isNodejsInstalled.result),
        first()
      )
      .subscribe(res => {
        this.router.navigate(['/workspaces']);
      });
  }
}
