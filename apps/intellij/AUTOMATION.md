# IntelliJ automation with Kotlin

Run the development plugin in a separate IntelliJ sandbox and execute Kotlin
programs against it with JetBrains Driver. The IDE stays open between programs.
The automation sources are separate from the plugin and are never packaged in it.

## Launch the IDE

Install the workspace dependencies with `yarn install --immutable`, then run:

```sh
CI=true JAVA_TOOL_OPTIONS='-XX:ActiveProcessorCount=4 -Dorg.gradle.workers.max=2 -Dorg.gradle.priority=low' \
  yarn nx run intellij:runAutomationIde --batch=false --parallel=2
```

This builds the plugin and its language server/webviews, opens the current
worktree, and uses `dist/apps/intellij/automation-sandbox` for IDE settings,
plugins, logs, and caches. Keep this command running while executing scenarios
from another terminal. Close this IDE normally to stop it.

`CI=true` selects the repository's build configuration that skips Plugin
Verifier's recommended IDE downloads. It does not make IntelliJ headless.
The launcher removes `CI` and `NX_DAEMON` from the IDE's environment so those
build settings do not disable Nx's daemon and file watching in test workspaces.
`--batch=false` uses the regular Nx Gradle executor; the currently installed
batch runner exits before executing tasks in this environment.

The launch target uses a separate Gradle project cache so its long-running task
does not lock out scenario compilation. To open a reproduction workspace, pass
`--args='--project-cache-dir=.gradle/automation-ide --max-workers=2 --priority=low -PautomationProject=/absolute/path'`.
Use a workspace with its own lockfile and installed dependencies: Nx Console
invokes its package manager to start the daemon.
The automation IDE uses `idea.trust.all.projects=true` to open reproduction
workspaces without repeated trust prompts. This launch property applies only
to the automation sandbox. The first launch can still require normal IDE setup.

Nx Console requires the IDE's JavaScript support. If a fresh sandbox starts in
free mode, use **Help → Register** to activate your existing Ultimate
subscription, close the dialog, and restart the automation IDE. The inspector
saves the UI hierarchy even when Nx Console is disabled, so startup dialogs can
also be inspected through Driver.

The JMX port is derived from the worktree path and printed on startup. Override
it with `-PautomationPort=7777` on both the launch and scenario commands if
necessary. JMX is bound to loopback and allows local processes to execute code
in the test IDE. The runner checks the worktree identity before running a
scenario.

## Inspect and control the running IDE

```sh
CI=true JAVA_TOOL_OPTIONS='-XX:ActiveProcessorCount=4 -Dorg.gradle.workers.max=2 -Dorg.gradle.priority=low' \
  yarn nx run intellij:runAutomation --batch=false --parallel=2 \
  --args='--max-workers=2 --priority=low'
```

The default `InspectIde.kt` scenario verifies that Nx Console is enabled and
writes `inspection.txt` and the Swing UI hierarchy `ui.html` under
`dist/apps/intellij/automation`.

Run the example that opens the Nx Console tool window and checks its visibility:

```sh
CI=true JAVA_TOOL_OPTIONS='-XX:ActiveProcessorCount=4 -Dorg.gradle.workers.max=2 -Dorg.gradle.priority=low' \
  yarn nx run intellij:runAutomation --batch=false --parallel=2 \
  --args='--max-workers=2 --priority=low -PautomationMain=dev.nx.console.automation.OpenNxConsoleKt'
```

Both Nx targets are uncached: each invocation interacts with the live IDE.
Kotlin compilation and ordinary build dependencies can still use their caches.

`CaptureIdeKt` captures the test IDE's windows through JetBrains' component
capture API and prints the image paths in a new directory for each run. Run it with
the same command and `-PautomationMain=dev.nx.console.automation.CaptureIdeKt`.

## Write a scenario

Add a `.kt` file under `src/automation/kotlin/dev/nx/console/automation` with a
`main` function. Run it by passing its generated main class with
`-PautomationMain=dev.nx.console.automation.MyScenarioKt`.

```kotlin
package dev.nx.console.automation

import com.intellij.driver.sdk.openToolWindow
import com.intellij.driver.sdk.waitForProjectOpen
import kotlin.time.Duration.Companion.minutes

fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    openToolWindow("Nx Console")
    inspectIde()
}
```

Use the saved hierarchy to discover selectors, then use `ui.x(selector)` to
interact with Swing controls. Driver also supports `invokeAction(actionId)` and
`ui.jcef(selector)` for JCEF HTML/JavaScript inspection. These operations require
the corresponding SDK imports. Prefer condition-based waits and explicit
assertions; a delivered click alone does not establish success. Native keyboard
and mouse actions may require macOS Accessibility permission for the test IDE.

Driver artifacts are resolved using the configured IDE's exact build number.
Its APIs are experimental, so check the matching SDK sources when changing IDE
versions. The IDE's bundled Performance Testing plugin supplies the server.

For a bug fix, preserve the scenario and its baseline failure, rebuild/relaunch
the IDE after changing the plugin, and rerun against the same fixture. Running
a scenario again does not reload plugin code or reset the opened workspace.
`instrumentCode` explicitly includes source files and compiled classes from its
task dependencies in its Nx cache inputs. The inferred inputs omit compiled
classes, which can restore old plugin bytecode after a Kotlin change. Keeping
this build step cacheable also allows its dependents to run on Nx Agents.

## Record reproduction and verification videos

Install `ffmpeg` on the machine running the scenarios. Wrap the scenario in
`recordIde` to save an MP4 even when an assertion fails:

```kotlin
fun main() = withAutomationDriver {
    waitForProjectOpen(2.minutes)
    recordIde(System.getenv("NX_AUTOMATION_LABEL") ?: "issue-repro") {
        openToolWindow("Nx Console")
        inspectIde()
        // Perform the issue's actions and assert the expected behavior here.
    }
}
```

Set `NX_AUTOMATION_LABEL=issue-repro` for the baseline run and
`NX_AUTOMATION_LABEL=post-fix` when rerunning the same scenario after rebuilding
and relaunching the changed plugin. Each run writes to a unique directory under
`dist/apps/intellij/automation`, containing the labeled MP4, captured PNGs,
frame timing manifest, and `result.txt` with PASS or the assertion failure.
Keep the baseline failure and post-fix success with the PR's verification notes.
A successful investigation run is not evidence of a reproduced bug.

The recording samples the main IDE window through JetBrains' component capture
API, preserves elapsed time, and encodes a silent H.264 MP4. Actual capture rate
depends on IDE responsiveness (typically 2–4 frames per second). Restore a
minimized IDE before recording so JCEF can initialize. Separate popup/dialog
windows are retained in the IDE screenshot log directories, but are not overlaid
on the main-window video.

`ReproGraphKt` checks cold full-graph loading, project focus, returning to the
full graph, restoring a manually hidden project, and focusing after closing the
graph. It expects an opened fixture with `demo → ui → core` and an independent
`unrelated` project. Its expected focus selection uses the Nx 23 graph's default
dependency distance of 1. Run it with:

```sh
NX_AUTOMATION_LABEL=graph-investigation CI=true \
  JAVA_TOOL_OPTIONS='-XX:ActiveProcessorCount=4 -Dorg.gradle.workers.max=2 -Dorg.gradle.priority=low' \
  yarn nx run intellij:runAutomation --batch=false --parallel=2 \
  --args='--max-workers=2 --priority=low -PautomationMain=dev.nx.console.automation.ReproGraphKt'
```

The scenario saves the selected projects and graph URL at each assertion.
Its focus step invokes the real action with an editor context-menu event.
On IntelliJ 252, Driver's `invokeAction(..., place = "EditorPopup")` alone does
not mark an event as a context-menu event, so it opens the project picker.

### Saved run arguments (#3191)

`ReproRunArgumentsKt` seeds a saved `demo:hello` run configuration with
`--greeting="hello from Nx Console"`, selects its Nx Console tree node, and
invokes the tree's registered Run action through `ActionManager`. It checks
both the saved configuration after launch and the arguments received by a real
Node process. This exercises the tree action without native mouse input.

Use an opened fixture named `intellij-automation-fixture`, with its own Nx
installation and lockfile. Set `"analytics": false` in its `nx.json` to avoid
the interactive Nx 23 analytics prompt. Its `demo/project.json` needs:

```json
{
  "name": "demo",
  "targets": {
    "hello": {
      "executor": "nx:run-commands",
      "cache": false,
      "options": {
        "command": "node demo/print-args.cjs"
      }
    }
  }
}
```

Create `demo/print-args.cjs` in that fixture:

```js
const fs = require('node:fs');
const args = process.argv.slice(2);
console.log('Arguments received by the target:', JSON.stringify(args));
fs.mkdirSync('.nx', { recursive: true });
fs.writeFileSync('.nx/automation-args.json', JSON.stringify(args));
```

Select the Projects/Targets list layout in Nx Console, then run:

```sh
NX_AUTOMATION_LABEL=issue-3191-repro CI=true \
  JAVA_TOOL_OPTIONS='-XX:ActiveProcessorCount=4 -Dorg.gradle.workers.max=2 -Dorg.gradle.priority=low' \
  yarn nx run intellij:runAutomation --batch=false --parallel=2 \
  --args='--max-workers=2 --priority=low -PautomationMain=dev.nx.console.automation.ReproRunArgumentsKt'
```

Rerun with `NX_AUTOMATION_LABEL=issue-3191-fixed` after rebuilding and restarting
the IDE. The scenario resets the saved argument and deletes the previous target
output each time. The video shows the initial saved argument in a diagnostic
editor tab and the actual task output in the Run tool window. A separate text
report records the saved argument before/after and the received argument array.

The tree Run action uses the SDK's EDT/read-action context, matching
`Driver.invokeAction`. Calling `actionPerformed` directly on the EDT can fail
IntelliJ's write-intent lock checks during execution startup.

### Folder tree roots

`ReproFolderTreeRootsKt` checks that a project whose root is a top-level
directory still renders as a project when other projects are nested inside it.
It expands the whole Nx Console tree, scrolls the node under test into view, and
asserts on the paths the tree actually renders.

Use a fixture with **more than ten projects**, so the automatic tool window style
resolves to the folder tree rather than the flat list, and with no project at the
workspace root. It needs a project rooted at `packages` named
`packages-aggregator` with a `hello` target, two projects nested below it at
`packages/a` and `packages/b` (`child-a`, `child-b`), and enough other projects
elsewhere to clear the ten-project threshold.

```sh
NX_AUTOMATION_LABEL=issue-folder-tree-roots-repro CI=true \
  JAVA_TOOL_OPTIONS='-XX:ActiveProcessorCount=4 -Dorg.gradle.workers.max=2 -Dorg.gradle.priority=low' \
  yarn nx run intellij:runAutomation --batch=false --parallel=2 \
  --args='--max-workers=2 --priority=low -PautomationMain=dev.nx.console.automation.ReproFolderTreeRootsKt'
```

Rerun with `NX_AUTOMATION_LABEL=issue-folder-tree-roots-fixed` after rebuilding
and restarting the IDE. The video shows the selected tree row: the folder
`packages` with no target before the fix, and the project `packages-aggregator`
with its `hello` target and both nested projects after it.

### Generate UI dry-run tabs (#2054)

`ReproGenerateDryRunTabsKt` enables the platform's advanced setting that pins
new Run tool window tabs (`start.run.configurations.pinned`), opens **Nx
Generate (UI)** for a local generator, and changes its `name` field three times.
Each change triggers a dry run. The scenario asserts that the Run tool window
holds a single `Nx Generate` tab showing the latest dry run and that nothing was
written to disk. It restores the setting afterwards. Set
`NX_AUTOMATION_PINNED_TABS=false` to run the same steps with unpinned tabs.

The generator is chosen through the popup's list and `JBPopup.closeOk`, and the
field is changed by setting the input's value and dispatching an `input` event
in the Generate UI webview. Neither step uses native mouse or keyboard input.

Use a fixture named `generate-dry-run-tabs-fixture` with `"analytics": false`
and a local plugin installed as a dev dependency
(`npm install -D ./tools/notes-plugin`). Its `package.json` names it
`@fixture/notes-plugin` and points `generators` at a `note` generator whose
schema has a required string `name` and whose factory writes
`notes/<name>.md`:

```js
module.exports = async function (tree, options) {
  tree.write(`notes/${options.name}.md`, `# ${options.name}\n`);
};
```

```sh
NX_AUTOMATION_LABEL=issue-2054-repro CI=true \
  JAVA_TOOL_OPTIONS='-XX:ActiveProcessorCount=4 -Dorg.gradle.workers.max=2 -Dorg.gradle.priority=low' \
  yarn nx run intellij:runAutomation --batch=false --parallel=2 \
  --args='--max-workers=2 --priority=low -PautomationMain=dev.nx.console.automation.ReproGenerateDryRunTabsKt'
```

Rerun with `NX_AUTOMATION_LABEL=issue-2054-fixed` after rebuilding and
restarting the IDE. The video shows one pinned `Nx Generate` tab per dry run
before the fix, and a single tab replaced by each dry run after it.

References:

- [JetBrains Driver SDK](https://github.com/JetBrains/intellij-community/blob/master/tools/intellij.tools.ide.starter.driver/README.md)
- [UI testing and selectors](https://plugins.jetbrains.com/docs/intellij/integration-tests-ui.html)
- [JCEF helper for IntelliJ 252](https://github.com/JetBrains/intellij-community/blob/idea/252.23892.409/platform/remote-driver/test-sdk/src/com/intellij/driver/sdk/ui/components/common/JCefUI.kt)
