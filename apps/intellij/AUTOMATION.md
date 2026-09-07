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

References:

- [JetBrains Driver SDK](https://github.com/JetBrains/intellij-community/blob/master/tools/intellij.tools.ide.starter.driver/README.md)
- [UI testing and selectors](https://plugins.jetbrains.com/docs/intellij/integration-tests-ui.html)
- [JCEF helper for IntelliJ 252](https://github.com/JetBrains/intellij-community/blob/idea/252.23892.409/platform/remote-driver/test-sdk/src/com/intellij/driver/sdk/ui/components/common/JCefUI.kt)
