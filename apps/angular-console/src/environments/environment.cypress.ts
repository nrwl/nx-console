import { Environment } from '@angular-console/environment';
import { GetDirectoryPathGQL } from '@angular-console/feature-workspaces';
import { of } from 'rxjs';

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
  providers: [
    { provide: GetDirectoryPathGQL, useClass: MockGetDirectoryPathGQL }
  ]
};
