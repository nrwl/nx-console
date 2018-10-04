import { CanActivateChild, Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { map, tap } from 'rxjs/operators';

@Injectable()
export class IsNodeJsInstalledGuard implements CanActivateChild {
  constructor(
    private readonly apollo: Apollo,
    private readonly router: Router
  ) {}

  canActivateChild(): Observable<boolean> {
    return this.apollo
      .query({
        query: gql`
          query {
            isNodejsInstalled {
              result
            }
          }
        `
      })
      .pipe(
        map(
          (v: { data: { isNodejsInstalled: { result: boolean } } }) =>
            v.data.isNodejsInstalled.result
        ),
        tap(result => {
          if (!result) {
            this.router.navigate(['/install-nodejs']);
          }
        })
      );
  }
}
