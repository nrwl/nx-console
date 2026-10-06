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

## Run the project-view e2e test

See the [local E2E setup guide](e2e/README.md) for platform dependencies, license
setup, and recording instructions.

```bash
CI=true NX_NO_CLOUD=true NX_DAEMON=false yarn nx run intellij:e2e-ci--project-view --skip-nx-cache
```

The same runner also runs the platform LSP scenarios as individual Nx Agent tasks:

| Target | Scenario |
| --- | --- |
| `intellij:e2e-ci--project-view` | `ProjectViewTestKt` |
| `intellij:e2e-ci--editor-features` | `NxlsEditorFeaturesKt` |
| `intellij:e2e-ci--custom-requests` | `NxlsCustomRequestsKt` |
| `intellij:e2e-ci--lifecycle` | `NxlsLifecycleKt` |
| `intellij:e2e-ci--editor-freeze` | `ReproEditorFreezeKt` |

`intellij:e2e-ci` depends on all five; `intellij:e2e` runs that aggregate. Each
starts a fresh IDE, fixture, sandbox, and automation port. The runner accepts
`NX_E2E_SCENARIO_NAME` and `NX_E2E_SCENARIO_CLASS`, defaulting to project-view.
Targets supply those variables and the runner uses the name as the recording
label. The Kotlin client is built before startup and then runs directly with
Java, avoiding another Gradle daemon while the IDE is running.

Project-view keeps `dist/apps/intellij/e2e/latest`; the other targets write to
`dist/apps/intellij/e2e/<scenario>`. Each directory contains `result.json`, a
JUnit testcase named after the scenario, logs, recordings, and `<scenario>.txt`.
The runner collects the platform scenarios' existing `result.txt` as their proof;
it requires both a successful client exit and `PASS` in the proof. Each run
replaces only its own directory. CI uploads all scenario directories. Failed
assertions or startup timeouts fail the task. Cleanup stops the run's IDE,
launcher, display, and fixture daemon and removes its fixture and sandbox.

The generated fixture supplies all the cases described below: `analytics: false`
and `namedInputs.default: ["{projectRoot}/**/*"]` in `nx.json`, a root
`package.json` with `nx.targets.hello`, `demo/project.json` with `hello` and
`inputs: ["default"]`, and `libs/util/project.json` with `build`. Both `hello`
targets use `nx:run-commands` with `command: "node -e 0"`. The local dev dependency
`@fixture/notes-plugin` supplies the no-op `note` generator and the exact required
schema defaults shown in the custom-requests section. Nx and the plugin are
symlinked into the fixture, so no fixture dependency download is needed. See the
[fixture reference](e2e/README.md#runner-and-fixture) for the complete contents.

On Linux, install `xvfb` and `ffmpeg`. Each run creates a private virtual display
and records it from IDE startup, including startup failures. No desktop session
or physical display is required. The IDE still runs Swing with graphics enabled;
`java.awt.headless=true` cannot render this test. On macOS, `ffmpeg` and a logged-in
desktop session are required, and the existing Driver recorder captures the IDE.
The automation launcher sets `idea.is.integration.test=true` to suppress
onboarding dialogs, including the Islands theme introduction in IDEA 2025.3,
as [recommended by JetBrains](https://platform.jetbrains.com/t/how-to-disable-the-islands-theme-popup/3842).
It also uses IntelliJ's test policy text and disables consent confirmation so
first-run dialogs do not block a fresh sandbox.

The pinned IntelliJ IDEA Ultimate distribution requires activation. Set
`NX_INTELLIJ_LICENSE_FILE` to an activated `idea.key` for unattended fresh
sandboxes. This is the same key-file mechanism supported by
[JetBrains Starter](https://github.com/JetBrains/intellij-community/blob/b76de2a6040beb10a4782d23756b58c2ce24e157/tools/intellij.tools.ide.starter/src/com/intellij/ide/starter/ide/IDETestContext.kt#L555).
An interactive JetBrains Account sign-in in another sandbox does not provision
the fresh test sandbox.

The regular **CI Checks** workflow already includes `e2e-ci` in its `nx affected` command.
`intellij:e2e-ci` depends on the individual `intellij:e2e-ci--project-view` test,
so changes to IntelliJ or its dependencies select the test automatically. The
existing `intellij:e2e` command remains an alias for all IntelliJ e2e tests.

The existing IntelliJ assignment rule schedules the test on a
`linux-large-plus-js` Nx Agent. The shared agent setup installs Java 21, Xvfb,
and ffmpeg. The test declares its dependency builds in the Nx task graph so
Nx Agents can build or restore their outputs before running it. The Gradle
build, live IDE, and Kotlin client run together on the test's agent.
The target disables parallel tasks on its agent while running and limits the
IDE heap to 1 GB, Gradle to 512 MB, and the Kotlin daemon to 1 GB. Nested Nx
build/launch commands disable distribution because their sandbox and exported
Java classpath are specific to that machine. The individual test is cacheable,
with only the evidence directory as its output.

Nx Cloud enables failure caching on agents so failure reports and video can be
returned alongside successful results. GitHub uploads the restored evidence with
`if: always()` when the test produced a report. Unchanged task inputs reuse the
cached result, reports, and recording; changed inputs trigger a new test run.
Cached evidence retains its original test run ID. Unaffected projects are still
excluded by Nx. Use `--skip-nx-cache` when you want a new recording or need to
retry a transient failure with unchanged inputs. A cancelled or killed agent may
not finish saving its evidence.

Configure the repository secret once, using an activated `idea.key`:

```bash
base64 < /absolute/path/to/idea.key | gh secret set IDEA_LICENSE_BASE64 --repo nrwl/nx-console
```

To obtain that file, activate the pinned IDEA distribution once using an
[offline activation code from your JetBrains Account](https://www.jetbrains.com/help/idea/register.html).
The automation sandbox stores the resulting key at
`dist/apps/intellij/automation-sandbox/config_runAutomationIde/idea.key`.
An ordinary IDE installation stores it in its
[IDE configuration directory](https://intellij-support.jetbrains.com/hc/en-us/articles/206544609-How-to-find-the-license-file-or-information-used-by-the-IDE).
Use the generated key file, rather than a JetBrains Account password or token.

The workflow forwards `IDEA_LICENSE_BASE64` with Nx Cloud's `--with-env-vars`.
The runner decodes it into the agent's private temporary sandbox, removes the
secret from child-process environments, and deletes the sandbox at shutdown.
The key, IDE configuration, and machine-specific classpath files are outside
the cached evidence directory. Local runs can keep using
`NX_INTELLIJ_LICENSE_FILE` instead. On an Nx Agent, a missing license fails the
test immediately with a provisioning error. GitHub does not expose repository
secrets to pull requests from forks, so those runs cannot activate this IDE.

Key provisioning does not determine the number of concurrent IDEs the license
covers. JetBrains' [multi-machine guidance](https://intellij-support.jetbrains.com/hc/en-us/articles/207241005)
describes use by one licensed person; it does not explicitly cover a shared pool
of unattended CI agents. Confirm the intended CI concurrency with JetBrains
before provisioning the repository secret. Each test launches one IDE, and
separate CI runs can overlap.

To check failure reporting and cleanup, set
`NX_E2E_EXPECTED_PROJECT=missing-project`; the same test must fail.
The first Linux run downloads IntelliJ and its plugins. CI agents disable Nx's
plugin timeout for this cold Gradle setup; the affected CI step retains its
60-minute timeout. The standalone automation launcher defaults to a 2 GB IDE
heap; override it with `NX_AUTOMATION_IDE_HEAP`.

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

The recording samples the IDE windows through JetBrains' component capture
API, preserves elapsed time, and encodes a silent H.264 MP4. Actual capture rate
depends on IDE responsiveness (typically 2–4 frames per second). Restore a
minimized IDE before recording so JCEF can initialize. Popups and dialogs are
separate windows. Each frame draws them onto the main window at their on-screen
offsets, matching each captured image to a showing window by size. A window
that extends past the main window is cropped to it.

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

### Editor freeze on nx config files (NXC-5033)

`ReproEditorFreezeKt` covers the UI freezes JetBrains reported from their
Marketplace freeze dashboard, whose largest cluster was
`network on EDT NxEditorListener.editorCreated`. Opening an nx config file used
to write the `didOpen` notification into the nxls stdin pipe on the EDT, which
blocks for as long as the language server is not draining that pipe.

The scenario opens `nx.json` and `package.json`, checks the platform LSP server's
open-document state, types into one of them, and closes them all. A heartbeat
on a separate Driver connection probes the EDT throughout these operations and
fails if a round trip takes longer than two seconds.

Any Nx workspace works as the fixture; no extra setup is needed.

```sh
NX_AUTOMATION_LABEL=nxc-5033-repro CI=true \
  JAVA_TOOL_OPTIONS='-XX:ActiveProcessorCount=4 -Dorg.gradle.workers.max=2 -Dorg.gradle.priority=low' \
  yarn nx run intellij:runAutomation --batch=false --parallel=2 \
  --args='--max-workers=2 --priority=low -PautomationMain=dev.nx.console.automation.ReproEditorFreezeKt'
```

The negative controls below demonstrate detection of an in-operation freeze and
a disconnected document. Transport blocking is also covered by the deterministic
`NxlsTransportFreezeTest` and `NxlsPlatformExecutorTest` unit tests.

### Stalled language server (#3234, #3162)

`ReproStalledNxlsKt` pauses the automation IDE's own nxls with `SIGSTOP`, so
nothing drains its stdin pipe, for 12 seconds. This is what a server busy
booting or recomputing the project graph looks like from the IDE. During the
stall it opens a `package.json` larger than the pipe buffer, which sends a
`didOpen` from the EDT (#3234). It then calls `NxProjectJsonToProjectMap.init()`,
which sends `nx/projectsByPaths` from `Dispatchers.Default` (#3162). Five
seconds into the stall it takes a `jstack` of the IDE. The scenario fails if an
EDT round trip exceeds two seconds, or if the EDT or a `DefaultDispatcher-worker`
thread is in `FileOutputStream.writeBytes` or `StreamMessageConsumer.consume`.
Only the platform's `LSP Executor` thread may wait on the pipe.

The nxls process is found through the IDE ancestor whose
`nx.console.automation.workspace` matches this worktree, so no other IDE's
server is paused. The fixture's root `package.json` must be at least 128 KiB.
Pad it, for example:

```sh
node -e "const f='package.json',p=JSON.parse(require('fs').readFileSync(f));p.nxConsoleFreezeFixturePadding=Array.from({length:3000},(_,i)=>'padding-entry-'+String(i).padStart(5,'0')+'-'.repeat(40));require('fs').writeFileSync(f,JSON.stringify(p,null,2)+'\n')"
```

```sh
NX_AUTOMATION_LABEL=stalled-nxls CI=true \
  JAVA_TOOL_OPTIONS='-XX:ActiveProcessorCount=4 -Dorg.gradle.workers.max=2 -Dorg.gradle.priority=low' \
  yarn nx run intellij:runAutomation --batch=false --parallel=2 \
  --args='--max-workers=2 --priority=low -PautomationMain=dev.nx.console.automation.ReproStalledNxlsKt'
```

### Platform LSP editor features

`NxlsEditorFeaturesKt` opens `nx.json`, `demo/project.json`, and `package.json`
and waits for the Nx language server to be Running. For each file it checks a
non-empty lookup containing an expected Nx key **from an LSP completion item**,
accepts a server item with `InsertTextFormat.Snippet`, and checks both an active
live-template tab stop and the absence of literal `${` / `$0` in the document.
It verifies that the document is still unsaved and unchanged on disk, then
requests completion again in the same object: the inserted key must disappear
from the server's suggestions while another expected key remains.

Quick Documentation exercises the platform's LSP hover provider without native
mouse input. It must render documentation for `namedInputs` in `nx.json` and
`command` in the other two files. Executor documentation must contain an HTML
anchor to `nx.dev`, with no raw Markdown link. The scenario also checks the
platform's document-link cache, follows an `inputs: ["default"]` link to the
correct line in `nx.json`, and invokes Go to Declaration on `nx:run-commands`,
asserting that its implementation file opens. `workspace.json` is excluded
because nxls does not register a schema for it.

Use a disposable, trusted Nx workspace with installed dependencies and a
lockfile. Its root `nx.json` must contain:

```json
{
  "analytics": false,
  "namedInputs": { "default": ["{projectRoot}/**/*"] }
}
```

It also needs a root `package.json` and `demo/project.json` with a `demo` project
and a `hello` target using `nx:run-commands`, for example:

```json
{
  "name": "demo",
  "targets": {
    "hello": {
      "executor": "nx:run-commands",
      "inputs": ["default"],
      "options": { "command": "node -e 0" }
    }
  }
}
```

Save these files before running. The scenario temporarily edits their IDE
buffers, suppresses automatic saving, and restores and saves the original text
in `finally`. Explicit saves remain enabled so a completion that force-saves
still fails. The fixture must use an Nx installation whose run-commands
implementation is under the `nx` package and ends in
`run-commands/run-commands.impl.js`.

The scenario activates the IDE application and waits for editor focus before
invoking completion or documentation. On macOS, bringing the frame forward alone
does not activate the application; the completion action can then produce no
lookup even though a direct platform request returns LSP items. Template traversal
uses editor actions so document changes run inside an IntelliJ command.

On the pinned IntelliJ 2025.3.6.1 platform, document-link navigation discards URI
fragments: `LspDocumentLinkSymbolReference` resolves the target file and creates
`LspNavigatableSymbol(file, null)`. An nxls link such as `nx.json#4` therefore opens
the file without navigating to line 4. The scenario checks the destination file
and pins this line-zero behavior, so a platform change that starts honoring fragments will fail the assertion and prompt
a review. `LspDocumentLinkSupport` has no navigation hook.

From the repository root, against the already running automation IDE:

```sh
NX_AUTOMATION_LABEL=nxls-editor-features CI=true \
  JAVA_TOOL_OPTIONS='-XX:ActiveProcessorCount=4' \
  ./gradlew :intellij:runAutomation --max-workers=2 --priority=low \
  -PautomationMain=dev.nx.console.automation.NxlsEditorFeaturesKt
```

These direct Gradle commands avoid Nx Gradle project-graph discovery timeouts.
Add the same `-PautomationPort=...` used by the IDE launcher if overriding the
port. Each new scenario records an MP4 and `result.txt`, plus a timestamped text
report in `dist/apps/intellij/automation`. The editor report includes the actual
snippet, updated completion labels, documentation HTML, and link destinations.
A native mouse-hover activation check remains manual; Quick Documentation
asserts the shared LSP hover response and rendering path.

### Platform LSP custom requests

`NxlsCustomRequestsKt` asserts on rendered UI for the main custom-request paths:
the Nx project/folder tree (`nx/workspace`, `nx/projectFolderTree`), the generator
picker and populated Generate UI (`nx/generators`, `nx/generatorOptions`,
`nx/transformedGeneratorSchema`), and the project details view (`nx/pdvData`).
The generator form must display string, boolean, and numeric defaults, so merely
opening an empty form or decoding only generator names cannot pass. Project
details must render `demo` and its `hello` target. This samples these
request paths; it does not claim individual coverage of every custom method.

Extend the editor fixture above with a project named `util` rooted at
`libs/util`. The scenario temporarily selects **Folder** in Nx Console's tool
window style setting and restores the original style afterwards. It requires both the
`demo / hello` target and the `libs / util` folder/project path, and rejects
duplicate rendered paths. A flat list does not exercise `nx/projectFolderTree`.

Install a local generator as a dev dependency
(`npm install -D ./tools/notes-plugin`). Give its `package.json` the name
`@fixture/notes-plugin` and `"generators": "./generators.json"`. The
`generators.json` file should contain:

```json
{
  "generators": {
    "note": {
      "factory": "./note.cjs",
      "schema": "./schema.json",
      "description": "Automation note generator"
    }
  }
}
```

Use this `schema.json`; keeping every option required makes every checked field
visible without expanding optional options:

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string", "default": "migration-note" },
    "directory": { "type": "string", "default": "notes" },
    "enabled": { "type": "boolean", "default": true },
    "retries": { "type": "number", "default": 3 }
  },
  "required": ["name", "directory", "enabled", "retries"]
}
```

Use `module.exports = async function () {};` for `note.cjs`. The no-op factory
also makes Generate UI's automatic dry run harmless. Clear generator filters
and use default generator context settings so the form defaults are not
intentionally overridden. The scenario closes editors when switching between
webviews, selects the generator through `JBPopup.closeOk`, and opens project
details through the editor's preview API; it uses no native input.

```sh
NX_AUTOMATION_LABEL=nxls-custom-requests CI=true \
  JAVA_TOOL_OPTIONS='-XX:ActiveProcessorCount=4' \
  ./gradlew :intellij:runAutomation --max-workers=2 --priority=low \
  -PautomationMain=dev.nx.console.automation.NxlsCustomRequestsKt
```

The report saves the rendered tree, generator rows, form defaults, and project
details text. Running a target is covered separately by `ReproRunArgumentsKt`.

Run each platform LSP scenario against a freshly launched automation IDE. They
leave editors, lookups, tool window style and Generate UI webviews behind, and
running several in sequence against one IDE has produced failures that do not
reproduce on a clean launch.

### Platform LSP lifecycle and editor reconnection

`NxlsLifecycleKt` starts with a populated folder tree and opens all three config
files **before** refreshing. It runs Refresh Nx Workspace once and then twice
more, awaiting a fresh success notification, a replaced tree-model root, and a
populated tree after each invocation. Refresh errors, a missing completion notification, duplicate tree
paths, and duplicate success notifications fail the scenario.

Before selecting any tab after a refresh, the replacement's platform LSP
`openedFiles` state must already include all three documents. Each buffer keeps
an unsaved property across the restart; a direct completion request to the new
server must omit that property and offer another known property. The request
does not select a tab, edit text, or use the UI lookup cache. Disk contents must
remain unchanged. This checks both reattachment and receipt of unsaved text.

After these checks, completion and Quick Documentation must still work in the
original editor instances, including the rendered `nx.dev` executor link. The
LSP completion items must all belong to one new
server generation, newer than before the refresh. This catches stale results
and reconnection failures that can be concealed by closing and reopening tabs.
The scenario also compares the listener class/count maps on both Nx workspace
refresh topics before and after every refresh, detecting lost or accumulating
subscriptions. This uses the pinned platform's message-bus introspection API
and reads the plugin's topic fields through Driver; no test listener or
production hook is installed. The lazy standard graph service is initialized
before capturing the baseline because Refresh Nx Workspace initializes it too.
Driver remote interfaces are checked at runtime,
so recheck these bindings when upgrading the IDE.

Every operation has EDT round trips before and after it, and refresh polling
continues to probe the EDT while the action is pending. Each round trip must
finish in less than two seconds. The report includes timings, generations,
subscriber maps, documentation, and rendered trees.

Use the editor fixture with the folder-tree extension described above. No local
generator is needed. Save the config files first. The scenario restores edited
buffers, the automatic-save token, and the original tool window style. It temporarily enables Nx refresh
notifications, restores that preference afterwards, and leaves the three editor
tabs open. Do not dismiss refresh notifications while it runs.

```sh
NX_AUTOMATION_LABEL=nxls-lifecycle CI=true \
  JAVA_TOOL_OPTIONS='-XX:ActiveProcessorCount=4' \
  ./gradlew :intellij:runAutomation --max-workers=2 --priority=low \
  -PautomationMain=dev.nx.console.automation.NxlsLifecycleKt
```

Capture baseline and post-migration runs against the same fixture using distinct
labels. Compilation and unit tests do not substitute for these live-IDE runs.

### Negative controls for lifecycle and freeze coverage

`ReproEditorFreezeKt` runs an EDT heartbeat through a separate Driver connection
throughout opening, typing, restoring, and closing documents. Every sample must
finish within two seconds, including samples queued during an operation. Its
connection checks read the platform LSP document state, and closing must remove
the documents from that state. The scenario records a video and `result.txt`.

Set `NX_AUTOMATION_FAULT` for a deliberate failing run. Each control changes only
the live IDE/server, leaving the fixture on disk intact:

| Scenario | Fault | Expected failure |
| --- | --- | --- |
| `NxlsLifecycleKt` | `missing-document` | After the first refresh, send `didClose` for one document; the pre-selection tracking assertion fails. |
| `NxlsLifecycleKt` | `stale-document` | Replace one server-side document with text missing its unsaved property; the direct completion assertion fails. |
| `ReproEditorFreezeKt` | `edt-freeze` | Sleep on the EDT for three seconds inside the open operation; the concurrent heartbeat exceeds two seconds. |
| `ReproEditorFreezeKt` | `disconnected-document` | Send `didClose` while the editor stays open; the platform tracking assertion fails. |

Run each negative control in a freshly launched IDE, just like positive runs.
Omit `NX_AUTOMATION_FAULT` for normal validation. A failing control must name the
expected assertion; an unrelated failure does not demonstrate coverage.
