import * as path from 'path';
import { Global, Module, Provider } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { QueryResolver } from './resolvers/query.resolver';
import { MutationResolver } from './resolvers/mutation.resolver';
import { CompletionsTypesResolver } from './resolvers/completion-types.resolver';
import { SchematicCollectionResolver } from './resolvers/schematic-collection.resolver';
import { ProjectResolver } from './resolvers/project.resolver';
import { NpmScriptResolver } from './resolvers/npm-script.resolver';
import { DocsResolver } from './resolvers/docs.resolver';
import { WorkspaceResolver } from './resolvers/workspace.resolver';
import { ArchitectResolver } from './resolvers/architect.resolver';
import { AngularConsoleExtensionsModule } from '@nrwl/angular-console-enterprise-electron';
import { readSettings } from './api/read-settings';
import { commands } from './api/run-command';
import { Telemetry } from './utils/telemetry';
import { docs } from './api/docs';
import { DefaultController } from './default.controller';

export function createServerModule(exports: string[], providers: Provider[]) {
  @Global()
  @Module({
    providers: [
      ...providers,
      {
        provide: 'readSettings',
        useFactory: store => () => readSettings(store),
        inject: ['store']
      },
      { provide: 'commands', useValue: commands },
      {
        provide: 'telemetry',
        useFactory: store => new Telemetry(store),
        inject: ['store']
      },
      { provide: 'docs', useValue: docs }
    ],
    exports: [...exports, 'readSettings', 'commands', 'telemetry', 'docs']
  })
  class CoreModule {}

  @Module({
    imports: [
      CoreModule,
      AngularConsoleExtensionsModule,
      GraphQLModule.forRoot({
        typePaths: [
          path.join(__dirname, 'assets/schema.graphql'),
          path.join(
            __dirname,
            './node_modules/@nrwl/angular-console-enterprise-electron/schema.graphql'
          )
        ],
        bodyParserConfig: true
      })
    ],
    providers: [
      QueryResolver,
      WorkspaceResolver,
      SchematicCollectionResolver,
      ArchitectResolver,
      ProjectResolver,
      NpmScriptResolver,
      CompletionsTypesResolver,
      DocsResolver,
      MutationResolver
    ],
    controllers: [DefaultController]
  })
  class ServerModule {}

  return ServerModule;
}
