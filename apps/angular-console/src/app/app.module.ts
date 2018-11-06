import { FeatureActionBarModule } from '@angular-console/feature-action-bar';
import {
  FeatureWorkspacesModule,
  workspaceRoutes
} from '@angular-console/feature-workspaces';
import {
  settingsRoutes,
  FeatureSettingsModule
} from '@angular-console/feature-settings';
import { UiModule } from '@angular-console/ui';
import {
  Telemetry,
  IsNodeJsInstalledGuard,
  Messenger
} from '@angular-console/utils';
import { HttpClientModule } from '@angular/common/http';
import { NgModule, Inject } from '@angular/core';
import {
  MatIconModule,
  MatListModule,
  MatSidenavModule,
  MatSnackBarModule
} from '@angular/material';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import {
  AngularConsoleEnterpriseFrontendModule,
  connectRoutes
} from '@nrwl/angular-console-enterprise-frontend';
import { APOLLO_OPTIONS, ApolloModule } from 'apollo-angular';
import { HttpLink, HttpLinkModule } from 'apollo-angular-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { onError } from 'apollo-link-error';

import { AppComponent } from './app.component';

export function initApollo(
  telemetry: Telemetry,
  messenger: Messenger,
  httpLink: HttpLink
) {
  telemetry.setUpRouterLogging();

  const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message }) => {
        messenger.error(message);
        telemetry.reportException(message);
      });
    } else if (networkError) {
      const n: any = networkError;
      if (n.error && n.error.errors && n.error.errors.length > 0) {
        const message = n.error.errors[0].message;
        messenger.error(message);
        telemetry.reportException(message);
      } else {
        messenger.error(n.message);
        telemetry.reportException(n.message);
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
    FeatureActionBarModule,
    FeatureSettingsModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatSnackBarModule,
    BrowserModule,
    BrowserAnimationsModule,
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
        {
          path: 'connect',
          children: connectRoutes
        },
        { path: 'settings', children: settingsRoutes }
      ],
      { paramsInheritanceStrategy: 'always' }
    )
  ],
  providers: [
    IsNodeJsInstalledGuard,
    {
      provide: 'telemetry',
      useClass: Telemetry
    },
    {
      provide: APOLLO_OPTIONS,
      useFactory: initApollo,
      deps: [[new Inject('telemetry')], Messenger, HttpLink]
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
