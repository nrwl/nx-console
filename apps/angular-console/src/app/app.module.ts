import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import {
  MatIconModule,
  MatIconRegistry,
  MatSnackBarModule
} from '@angular/material';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import {
  FeatureWorkspacesModule,
  workspaceRoutes
} from '@angular-console/feature-workspaces';
import { UiModule } from '@angular-console/ui';
import {
  AnalyticsCollector,
  CancelCommandGuard,
  Messenger
} from '@angular-console/utils';
import { Apollo, ApolloModule } from 'apollo-angular';
import { HttpLink, HttpLinkModule } from 'apollo-angular-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { onError } from 'apollo-link-error';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    MatIconModule,
    MatSnackBarModule,
    BrowserModule,
    BrowserAnimationsModule,
    ApolloModule,
    HttpLinkModule,
    HttpClientModule,
    FeatureWorkspacesModule,
    UiModule,
    RouterModule.forRoot(
      [
        { path: '', pathMatch: 'full', redirectTo: '/workspaces' },
        {
          path: '',
          children: workspaceRoutes,
          canActivateChild: [CancelCommandGuard]
        }
      ],
      { paramsInheritanceStrategy: 'always' }
    )
  ],
  providers: [CancelCommandGuard, AnalyticsCollector],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(
    analytics: AnalyticsCollector,
    apollo: Apollo,
    httpLink: HttpLink,
    matIconRegistry: MatIconRegistry,
    messenger: Messenger
  ) {
    analytics.setUpRouterLogging();

    const errorLink = onError(({ graphQLErrors, networkError }) => {
      if (graphQLErrors) {
        graphQLErrors.forEach(({ message }) => {
          messenger.error(message);
          analytics.reportException(message);
        });
      } else if (networkError) {
        const n: any = networkError;
        if (n.error && n.error.errors && n.error.errors.length > 0) {
          const message = n.error.errors[0].message;
          messenger.error(message);
          analytics.reportException(message);
        } else {
          messenger.error(n.message);
          analytics.reportException(n.message);
        }
      }
    });

    apollo.create({
      defaultOptions: {
        query: { fetchPolicy: 'network-only' },
        watchQuery: { fetchPolicy: 'network-only' }
      },
      link: errorLink.concat(httpLink.create({})),
      cache: new InMemoryCache()
    });
    matIconRegistry.setDefaultFontSetClass('material-icons-extended');
  }
}
