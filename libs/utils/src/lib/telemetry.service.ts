import { Injectable, Inject } from '@angular/core';
import { ExceptionOccuredGQL, ScreenViewedGQL } from './generated/graphql';
import { Observable } from 'rxjs';
import { ENVIRONMENT, Environment } from '@angular-console/environment';
import { timeout, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class Telemetry {
  constructor(
    @Inject(ENVIRONMENT)
    private readonly environment: Environment,
    private readonly exceptionOccuredGQL: ExceptionOccuredGQL,
    private readonly screenViewedGQL: ScreenViewedGQL
  ) {}

  get isDev() {
    return !this.environment.production;
  }

  exceptionOccured(error: string): void {
    this.send(this.exceptionOccuredGQL.mutate({ error }), 'ExceptionOccured');
  }

  screenViewed(screen: string): void {
    this.send(this.screenViewedGQL.mutate({ screen }), 'ScreenViewed');
  }

  send(req: Observable<any>, name: string): void {
    req
      .pipe(
        timeout(2000),
        take(1)
      )
      .subscribe(
        () => {
          if (this.isDev) {
            console.log(`[Telemetry Written: ${name}]`);
          }
        },
        () => {
          if (this.isDev) {
            console.error(`[Telemetry Failed: ${name}]`);
          }
        }
      );
  }
}
