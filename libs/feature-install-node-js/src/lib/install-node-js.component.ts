import { Settings, Telemetry } from '@angular-console/utils';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { filter, first } from 'rxjs/operators';

import { IsNodejsInstalledGQL } from './generated/graphql';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-install-node-js',
  templateUrl: './install-node-js.component.html',
  styleUrls: ['./install-node-js.component.scss']
})
export class InstallNodeJsComponent implements OnInit {
  constructor(
    private readonly telemetry: Telemetry,
    private readonly router: Router,
    private readonly settings: Settings,
    private readonly isNodejsInstalledGQL: IsNodejsInstalledGQL
  ) {}

  ngOnInit() {
    this.telemetry.screenViewed('Install Node');
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
