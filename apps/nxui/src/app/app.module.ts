import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';

import { MatIconModule, MatIconRegistry } from '@angular/material';
import { AppComponent } from './app.component';
import { HttpLink, HttpLinkModule } from 'apollo-angular-link-http';
import { Apollo, ApolloModule } from 'apollo-angular';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import {
  FeatureWorkspacesModule,
  workspaceRoutes
} from '@nxui/feature-workspaces';
import { BrowserModule } from '@angular/platform-browser';

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
