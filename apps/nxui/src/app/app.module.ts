import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { MatIconModule, MatIconRegistry } from '@angular/material';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import {
  FeatureWorkspacesModule,
  workspaceRoutes
} from '@nxui/feature-workspaces';
import { UiModule } from '@nxui/ui';
import { Apollo, ApolloModule } from 'apollo-angular';
import { HttpLink, HttpLinkModule } from 'apollo-angular-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    MatIconModule,
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
        { path: 'workspaces', children: workspaceRoutes }
      ],
      { paramsInheritanceStrategy: 'always' }
    )
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(
    apollo: Apollo,
    httpLink: HttpLink,
    matIconRegistry: MatIconRegistry
  ) {
    apollo.create({
      defaultOptions: {
        query: { fetchPolicy: 'network-only' },
        watchQuery: { fetchPolicy: 'network-only' }
      },
      link: httpLink.create({}),
      cache: new InMemoryCache()
    });

    matIconRegistry.setDefaultFontSetClass('material-icons-extended');
  }
}
