import { NpmScript } from '@angular-console/schema';
import { directoryExists } from '../utils/utils';
import * as path from 'path';
import { readNpmScriptSchema } from '../api/read-npm-scripts';
import { Context, Parent, ResolveProperty, Resolver } from '@nestjs/graphql';

@Resolver('NpmScript')
export class NpmScriptResolver {
  @ResolveProperty()
  schema(@Parent() parent: NpmScript, @Context() context: any) {
    if (!directoryExists(path.join(context.path, 'node_modules'))) {
      throw new Error(`node_modules is not found`);
    }
    return readNpmScriptSchema(context.path, parent.name);
  }
}
