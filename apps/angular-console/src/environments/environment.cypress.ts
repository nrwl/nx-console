import { Environment } from '@angular-console/environment';
import { GetDirectoryPathGQL } from '@angular-console/feature-workspaces';
import { of } from 'rxjs';
import { PlatformLocation } from '@angular/common';
import { InMemoryPlatformLocation } from '@angular-console/utils';

class MockGetDirectoryPathGQL extends GetDirectoryPathGQL {
  mutate() {
    return of({
      data: {
        selectDirectory: {
          selectedDirectoryPath: '/tmp',
          error: null
        }
      }
    });
  }
}

export const environment: Environment = {
  production: false,
  application: 'electron',
  disableAnimations: true,
  providers: [
    {
      provide: PlatformLocation,
      useClass: InMemoryPlatformLocation
    },
    { provide: GetDirectoryPathGQL, useClass: MockGetDirectoryPathGQL }
  ]
};
