import { Architect } from '@angular-console/schema';
import { directoryExists } from '../utils/utils';
import * as path from 'path';
import { readSchema } from '../api/read-projects';
import { Context, Parent, ResolveProperty, Resolver } from '@nestjs/graphql';

@Resolver('Architect')
export class ArchitectResolver {
  @ResolveProperty()
  schema(@Parent() parent: Architect, @Context() context: any) {
    if (!directoryExists(path.join(context.path, 'node_modules'))) {
      throw new Error(`node_modules is not found`);
    }
    return readSchema(context.path, parent.builder);
  }
}
