import { Workspace } from '../generated/graphql-types';
import { docs } from '../api/docs';
import {
  Args,
  Context,
  Parent,
  ResolveProperty,
  Resolver
} from '@nestjs/graphql';

@Resolver('Docs')
export class DocsResolver {
  @ResolveProperty()
  workspaceDocs(@Parent() _: Workspace, @Context() context: any) {
    const deps = {
      ...context.packageJson.dependencies,
      ...context.packageJson.devDependencies
    };
    return docs.workspaceDocs(deps).toPromise();
  }

  @ResolveProperty()
  schematicDocs(
    @Parent() _: Workspace,
    @Args('collectionName') collectionName: string,
    @Args('collectionName') name: string
  ) {
    // TODO: vsavkin read the version from node_modules and provide here instead of null
    return docs.schematicDocs(collectionName, null, name).toPromise();
  }
}
