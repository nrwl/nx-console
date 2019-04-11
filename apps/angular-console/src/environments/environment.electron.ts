import { Environment } from '@angular-console/environment';
import { DOCUMENT, PlatformLocation } from '@angular/common';
import { InMemoryPlatformLocation } from '@angular-console/utils';

export const environment: Environment = {
  production: true,
  providers: [
    {
      provide: PlatformLocation,
      useClass: InMemoryPlatformLocation,
      deps: [DOCUMENT]
    }
  ],
  application: 'electron'
};
