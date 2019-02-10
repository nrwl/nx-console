import { Inject } from '@nestjs/common';
import {
  NpmScript,
  Project,
  SchematicCollection,
  Workspace
} from '@angular-console/schema';
import { readSettings } from '../api/read-settings';
import { directoryExists, filterByName } from '../utils/utils';
import * as path from 'path';
import { readAllSchematicCollections } from '../api/read-schematic-collections';
import {
  Args,
  Context,
  Parent,
  ResolveProperty,
  Resolver
} from '@nestjs/graphql';

@Resolver('Workspace')
export class WorkspaceResolver {
  constructor(@Inject('store') private readonly store: any) {}

  @ResolveProperty()
  schematicCollections(
    @Args('name') name: string,
    @Context() context: any
  ): SchematicCollection[] {
    const settings = readSettings(this.store);
    if (!directoryExists(path.join(context.path, 'node_modules'))) {
      throw new Error(`node_modules is not found`);
    }
    return filterByName(
      readAllSchematicCollections(
        context.path,
        settings.workspaceSchematicsDirectory!,
        settings.workspaceSchematicsNpmScript!
      ),
      { name }
    );
  }

  @ResolveProperty()
  npmScripts(
    @Parent() workspace: Workspace,
    @Args('name') name: string
  ): NpmScript[] {
    return filterByName(workspace.npmScripts, { name });
  }

  @ResolveProperty()
  projects(
    @Parent() workspace: Workspace,
    @Args('name') name: string
  ): Project[] {
    return filterByName(workspace.projects, { name });
  }

  @ResolveProperty()
  completions(@Parent() workspace: Workspace) {
    return workspace;
  }

  @ResolveProperty()
  docs(@Parent() workspace: Workspace) {
    return workspace;
  }
}
