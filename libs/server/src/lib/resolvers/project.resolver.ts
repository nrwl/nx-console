import { Project } from '../generated/graphql-types';
import { filterByName } from '../utils/utils';
import { Args, Resolver, ResolveProperty, Parent } from '@nestjs/graphql';

@Resolver('Project')
export class ProjectResolver {
  @ResolveProperty()
  architect(@Parent() parent: Project, @Args('name') name: string) {
    return filterByName(parent.architect!, { name });
  }
}
