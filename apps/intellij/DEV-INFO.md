## To get everything up and running

1. Install the latest IntelliJ IDEA Ultimate Edition (You can try community version but not sure about the result ).
2. Configure JDK and Plugin SDK.
   - Since we are using gradle you can choose JDK 1.8
   - We are using `JavaScriptLanguage` support :
     - Create a new library with - `[IDEA Installation]/plugins/JavaScriptDebugger/lib/\*.jar`
     - Add this library to your project (see bellow)

**JavaScriptLanguage**

- JavaScript Support is added on two places `build.gradle` where we have this reference

```
intellij {
   version 'IU-2018.3.5'
   pluginName 'Angular Console'
   downloadSources false
   updateSinceUntilBuild true
   plugins = ['JavaScriptLanguage']
}
```

and inside `resources/META-INF/plugin.xml`

```
<idea-plugin>
    <id>io.nrwl.ide.console</id>
    <name>Angular UI Console</name>
    <version>1.0</version>
    <vendor email="frantisek@kolar.pro" url="http://www.nrwl.io/">Hoop</vendor>
    <description>Angular UI Console based implementation for Webstorm IDE</description>
    <depends>JavaScript</depends>
    <depends>com.intellij.modules.lang</depends>

```

To make it all work and to be able to compile this make sure you create `JavaScriptLanguage` library. This is how it looks
like in my IDE:

![JS LIbrary 1](./docs/IDE-JS1.png)

And this is how library is created:

![JS LIbrary 2](./docs/IDE-JS2.png)

- You basically reference existing plugin `jars` inside `Intellij installation folder`

**Bridge Java <-> Javascript**

To bridge the JAVA and JS world we are using the `ij-rpc-client` npm package that can provide a RPC LINK between
JS and JAVA layers. This way JAVA can easily interact with JS code and JS CODE can interact with JAVA.

Currently our typescript code sits inside `src/ngConsoleCli` where we have a `main.ts`. Right now we bundled
vanilla `ng new` project and added its DIST into `src/ngConsoleCli/server` from which is served using
express server.

```ts
app.use(express.static(publicDir));
app.listen(port);

rpcServer.send(DOMAIN, 'serverStarted');
```

**Current development flow:**  
(Assuming that all is setup correctly)

**1** - Under `src/ngConsoleCli` you need to run `npm install` so you can later on call `./node_modules/.bin/tsc -p tsconfig.json`
which compiles `main.ts` into `projectDir/gen` (I dont have it automated yet)

![Compiled to GEN](./docs/flow-1.png)

- TS source code can probably sit anywhere. Its important that the result goes in the
  `projectDir/gen`.

**2** -To build the plugin you need to run this command `./gradlew buildPlugin` (Or you can use ToolWindow)

![Compiled to GEN](./docs/flow-2.png)

- you will probably have available also the **run configurations** if you import this as gradle project.
- During the build process this task from the `build.gradle` build file also executes:

```
project.afterEvaluate {
    buildPlugin.doLast {

        def libraries = "$it.destinationDir/$intellij.pluginName/ngConsoleCli/"
        print("Copy librays: $libraries" )
        copy {
            from "$project.projectDir/gen/ngConsoleCli"
            into libraries

        }
    }

    prepareSandbox.doLast {

        def libraries = "$it.destinationDir/$intellij.pluginName/ngConsoleCli/"
        print("Copy librays: $libraries" )
        copy {
            from "$project.projectDir/gen/ngConsoleCli"
            into libraries

        }
    }
}
```

This copies content from `projectDir/gen` into the plugin destination (this is how the final structure looks like
when the plugin is packaged and distributed)

![Compiled to GEN](./docs/flow-3.png)
