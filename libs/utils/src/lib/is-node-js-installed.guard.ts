import { CanActivateChild, Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { IsNodejsInstalledGQL } from './generated/graphql';

@Injectable()
export class IsNodeJsInstalledGuard implements CanActivateChild {
  constructor(
    private readonly isNodejsInstalledGQL: IsNodejsInstalledGQL,
    private readonly router: Router
  ) {}

  canActivateChild(): Observable<boolean> {
    return this.isNodejsInstalledGQL.fetch().pipe(
      map((v: any) => v.data.isNodejsInstalled.result as boolean),
      tap(result => {
        if (!result) {
          this.router.navigate(['/install-nodejs']);
        }
      })
    );
  }
}
