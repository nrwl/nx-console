import { GetDirectoryPathGQL } from '@angular-console/feature-workspaces';
import { of } from 'rxjs';

class MockGetDirectoryPathGQL extends GetDirectoryPathGQL {
  mutate() {
    return of({
      data: {
        selectDirectory: {
          selectedDirectoryPath: '/tmp'
        }
      }
    });
  }
}

export const environment = {
  production: false,
  providers: [
    { provide: GetDirectoryPathGQL, useClass: MockGetDirectoryPathGQL }
  ]
};
