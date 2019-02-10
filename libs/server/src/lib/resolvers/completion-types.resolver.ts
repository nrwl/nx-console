import { Workspace } from '@angular-console/schema';
import {
  completeAbsoluteModules,
  completeFiles,
  completeLocalModules,
  completeProjects
} from '../api/completions';
import { files } from '../utils/utils';
import { Args, Resolver, ResolveProperty, Parent } from '@nestjs/graphql';

@Resolver('CompletionsTypes')
export class CompletionsTypesResolver {
  @ResolveProperty()
  files(@Parent() workspace: Workspace, @Args('input') input: string) {
    return completeFiles(files, workspace, input);
  }

  @ResolveProperty()
  projects(@Parent() workspace: Workspace, @Args('input') input: string) {
    return completeProjects(workspace, input);
  }

  @ResolveProperty()
  localModules(@Parent() workspace: Workspace, @Args('input') input: string) {
    return completeLocalModules(files, workspace, input);
  }

  @ResolveProperty()
  absoluteModules(
    @Parent() workspace: Workspace,
    @Args('input') input: string
  ) {
    return completeAbsoluteModules(files, workspace, input);
  }
}
