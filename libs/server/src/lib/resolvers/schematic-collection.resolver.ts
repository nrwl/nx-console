import { SchematicCollection } from '../generated/graphql-types';
import { filterByName } from '../utils/utils';
import { Args, Parent, ResolveProperty, Resolver } from '@nestjs/graphql';

@Resolver('SchematicCollection')
export class SchematicCollectionResolver {
  @ResolveProperty()
  schematics(
    @Parent() parent: SchematicCollection,
    @Args('name') name: string
  ) {
    return filterByName(parent.schematics!, { name });
  }
}
