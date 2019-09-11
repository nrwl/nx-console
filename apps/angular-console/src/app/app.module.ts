import {
  ENVIRONMENT,
  Environment,
  IS_INTELLIJ,
  IS_VSCODE
} from '@angular-console/environment';
import { FeatureSettingsModule } from '@angular-console/feature-settings';
import {
  FeatureWorkspacesModule,
  workspaceRoutes
} from '@angular-console/feature-workspaces';
import { UiModule } from '@angular-console/ui';
import {
  IsNodeJsInstalledGuard,
  Messenger,
  RouterNavigation,
  Telemetry
} from '@angular-console/utils';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import {
  MatIconModule,
  MatListModule,
  MatSidenavModule,
  MatSnackBarModule
} from '@angular/material';
import {
  BrowserAnimationsModule,
  NoopAnimationsModule
} from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { AngularConsoleEnterpriseFrontendModule } from '@nrwl/angular-console-enterprise-frontend';
import { APOLLO_OPTIONS, ApolloModule } from 'apollo-angular';
import { HttpLink, HttpLinkModule } from 'apollo-angular-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { onError } from 'apollo-link-error';

import { environment } from '../environments/environment';
import { AppComponent } from './app.component';

export function initApollo(
  telemetry: Telemetry,
  messenger: Messenger,
  httpLink: HttpLink
) {
  const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(error => {
        messenger.error(error.message);
        telemetry.exceptionOccured(error.message);
      });
    } else if (networkError) {
      const n: any = networkError;
      messenger.error('Angular Console Server was shutdown');
      if (n.error && n.error.errors && n.error.errors.length > 0) {
        const message = n.error.errors[0].message;
        telemetry.exceptionOccured(message);
        console.error(message);
      } else {
        telemetry.exceptionOccured(n.message);
        console.error(n.message);
      }
    }
  });

  return {
    defaultOptions: {
      query: { fetchPolicy: 'network-only' },
      watchQuery: { fetchPolicy: 'network-only' }
    },
    link: errorLink.concat(httpLink.create({}) as any), // TODO(jack): Remove the any once type errors are resolved.
    cache: new InMemoryCache()
  };
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    FeatureSettingsModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatSnackBarModule,
    environment.disableAnimations
      ? NoopAnimationsModule
      : BrowserAnimationsModule,
    ApolloModule,
    HttpLinkModule,
    HttpClientModule,
    FeatureWorkspacesModule,
    UiModule,
    AngularConsoleEnterpriseFrontendModule.forRoot(),
    RouterModule.forRoot(
      [
        { path: '', pathMatch: 'full', redirectTo: '/workspaces' },
        {
          path: '',
          children: workspaceRoutes,
          canActivateChild: [IsNodeJsInstalledGuard]
        },
        {
          path: 'install-nodejs',
          loadChildren:
            '@angular-console/feature-install-node-js#FeatureInstallNodeJsModule'
        },
        { path: '**', redirectTo: '/workspaces' }
      ],
      { paramsInheritanceStrategy: 'always' }
    )
  ],
  providers: [
    IsNodeJsInstalledGuard,
    {
      provide: APOLLO_OPTIONS,
      useFactory: initApollo,
      deps: [Telemetry, Messenger, HttpLink]
    },
    { provide: ENVIRONMENT, useValue: environment as Environment },
    { provide: IS_VSCODE, useValue: environment.application === 'vscode' },
    { provide: IS_INTELLIJ, useValue: environment.application === 'intellij' },
    { provide: 'messenger', useExisting: Messenger },
    ...environment.providers
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(location: RouterNavigation) {
    location.init();
  }
}
