import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, first, map, switchMap, takeWhile, tap } from 'rxjs/operators';
import {
  Messenger,
  NODE_JS_INSTALL_POLLING,
  Settings
} from '@angular-console/utils';
import {
  InstallNodeJsGQL,
  InstallNodeJsStatusGQL,
  IsNodejsInstalledGQL
} from './generated/graphql';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-install-node-js',
  templateUrl: './install-node-js.component.html',
  styleUrls: ['./install-node-js.component.scss']
})
export class InstallNodeJsComponent {
  installNodeJsStatus$?: Observable<boolean>;

  constructor(
    private readonly messenger: Messenger,
    private readonly router: Router,
    private readonly settings: Settings,
    private readonly installNodeJsGQL: InstallNodeJsGQL,
    private readonly installNodeJsStatusGQL: InstallNodeJsStatusGQL,
    private readonly isNodejsInstalledGQL: IsNodejsInstalledGQL
  ) {}

  installNodeJs() {
    this.installNodeJsStatus$ = this.installNodeJsGQL.mutate().pipe(
      switchMap(() => {
        return this.installNodeJsStatusGQL
          .watch(
            {},
            {
              pollInterval: NODE_JS_INSTALL_POLLING
            }
          )
          .valueChanges.pipe(map(result => result.data.installNodeJsStatus));
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
    this.isNodejsInstalledGQL
      .watch()
      .valueChanges.pipe(
        filter((v: any) => v.data.isNodejsInstalled.result),
        first()
      )
      .subscribe(() => {
        this.router.navigate(['/workspaces']);
      });
  }
}
