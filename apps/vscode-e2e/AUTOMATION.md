# VS Code automation

Run Nx Console in a real VS Code window, drive its UI with Playwright over the
Chrome DevTools Protocol, and run code in its extension host. Scenarios are
Playwright tests under `specs`. Every run writes labeled evidence: a video,
screenshots, a trace, VS Code logs and a PASS/FAIL result. The automation
sources live in `apps/vscode-e2e` and are never packaged in the extension.

## Launch the IDE

Install the workspace dependencies with `yarn install --immutable`, then run:

```sh
yarn nx run vscode-e2e:automation-ide --fixture=nested-projects
```

This builds the extension and the test runner, downloads VS Code 1.137.0 into
`.vscode-test`, creates the fixture workspace and opens it. Keep this command
running while you inspect the IDE or run scenarios from another terminal. Stop
it with Ctrl+C or by closing the VS Code window; both also stop the fixture's Nx
daemon.

- `--fixture=<name>` selects a workspace from `fixtures/workspaces.ts`
  (default `demo`). The fixture is recreated on every launch.
- `--workspace=/absolute/path` opens an existing workspace instead. It needs its
  own lockfile and installed dependencies: Nx Console starts the workspace's Nx
  daemon.

VS Code settings, extensions and logs live in a per-worktree directory under
`/tmp/nxc-ide-<hash>` (the OS temp directory on Linux). Its path stays short
because VS Code creates IPC sockets there. The launcher writes
`dist/apps/vscode-e2e/automation-ide/session.json` and `ide.log`.

The IDE does not inherit `NX_*`, `CI` or coding-agent environment variables
from the terminal, and runs with `NX_NO_CLOUD=true` unless its fixture says
otherwise. On Linux it runs on its own Xvfb display.

The DevTools endpoint is bound to loopback and lets local processes control the
IDE. The extension-host server additionally requires the per-launch token
stored in `session.json`.

## Inspect and control the running IDE

```sh
yarn nx run vscode-e2e:automation
```

The default `inspect` command writes `inspection.txt`, `ui.html` and
`screenshot.png` under `dist/apps/vscode-e2e/automation/inspect-<time>`.
`inspection.txt` lists the VS Code and Nx Console versions, the opened
workspace, the Projects view style, the rendered sidebar rows with their
expanded/collapsed state, and visible notifications. Use `ui.html` to find
selectors.

```sh
yarn nx run vscode-e2e:automation -- capture
yarn nx run vscode-e2e:automation -- eval "(vscode) => vscode.workspace.getConfiguration('nxConsole').get('projectViewingStyle')"
yarn nx run vscode-e2e:automation -- run path/to/script.ts
```

`eval` runs a function in the extension host with the `vscode` API and prints
its JSON result. The function is sent as source text, so it cannot use
variables from the calling module. `run` loads a TypeScript module whose
default export receives `{ page, evaluator, nxConsole, session, outputDir }`:

```ts
import type { AutomationScriptContext } from '../automation/cli';

export default async ({ nxConsole, outputDir }: AutomationScriptContext) => {
  await nxConsole.openNxConsoleSidebar();
  await nxConsole.expandTreeRow('e2es');
  await nxConsole.page.screenshot({ path: `${outputDir}/tree.png` });
};
```

Nx targets here are uncached: each invocation interacts with the live IDE.
Running a command again does not reload extension code or reset the workspace;
restart the launcher after rebuilding the extension.

## Write a scenario

Add a `*.test.ts` file under `specs` and import `test` and `expect` from
`../base-test`. The `vscode` fixture provides `page`, `nxConsole` (page
objects), `evaluator` (extension-host calls), `workspacePath`, `extension` (the
Nx Console build under test), `label`, and `proof()`.

```ts
import { expect, test } from '../base-test';

test.use({ vscodeOptions: { fixture: 'nested-projects' } });

test('parent projects expand to their nested projects', async ({ vscode }) => {
  const proof = vscode.proof(['My scenario', '']);
  await vscode.nxConsole.openNxConsoleSidebar();
  await vscode.nxConsole.expandTreeRow('e2es');
  const expandable = await vscode.nxConsole.isTreeRowExpandable('parent-e2e');
  await proof.show(`parent-e2e expandable: ${expandable}`);
  expect.soft(expandable).toBe(true);
});
```

Add fixtures to `fixtures/workspaces.ts` with `writeWorkspace`. Fixtures link
the repository's `node_modules`, set `"analytics": false`, and commit their
files to their own Git repository. A fixture can also set VS Code settings and
environment variables for the IDE. Values that exist only at run time, such as
a mock server URL, are passed through `vscodeOptions.fixtureContext`; those
scenarios always launch their own IDE.

`proof()` opens a text file next to the UI and appends one line per measured
fact, so a video shows why each assertion passed or failed. Prefer
`expect.soft` for the facts under test so a reproduction run still reaches
every step, and condition-based waits over sleeps. A delivered click alone does
not establish success.

While writing a scenario, run it against the running automation IDE instead of
launching VS Code each time:

```sh
VSCODE_E2E_ATTACH=1 yarn nx run vscode-e2e:e2e -- nested-projects
```

The IDE must have opened the fixture the scenario declares. Attached runs reuse
the window and its state. Without `VSCODE_E2E_ATTACH`, each scenario launches a
fresh VS Code with a fresh fixture and closes it afterwards.

## Record reproduction and verification videos

Install `ffmpeg` on the machine running the scenarios, then:

```sh
NX_AUTOMATION_LABEL=issue-3193-repro yarn nx run vscode-e2e:record -- nested-projects
```

Each run writes to `dist/apps/vscode-e2e/automation/<label>-<time>-<id>`:
`results.json`, `junit.xml`, an HTML `report`, `setup.json`, and a directory
per scenario under `tests` containing:

- `<label>.mp4`: the VS Code window, recorded through the DevTools screencast.
  Frames arrive when the UI changes, and the video keeps real time.
- `proof.txt`, `final.png`, `ui.html` and `trace.zip` (open it with
  `npx playwright show-trace`).
- `ide.log` (VS Code's output) and `logs` (VS Code and extension logs,
  including Nx Console's).
- `metadata.json`: the Git revision, a hash of uncommitted changes, the Nx
  Console source, version and bundle hash, the VS Code version and the fixture.
- `result.json` and `result.txt`: PASS, or the assertion and cleanup failures.

The evidence is saved when an assertion or VS Code startup fails.
`VSCODE_E2E_ATTACH=1` also works with `record`.

For a bug fix, run the scenario with `NX_AUTOMATION_LABEL=issue-<number>-repro`
before changing the code, keep the failing result, fix the bug, and rerun the
same scenario with `NX_AUTOMATION_LABEL=issue-<number>-fixed`. The `record` and
`e2e` targets rebuild the extension first. A successful investigation run is not
evidence of a reproduced bug.

### Test a released Nx Console or another build

```sh
VSCODE_E2E_EXTENSION_VERSION=18.101.1 NX_AUTOMATION_LABEL=issue-3193-18.101.1 \
  yarn nx run vscode-e2e:record -- nested-projects
```

`VSCODE_E2E_EXTENSION_VERSION` downloads that release from the Visual Studio
Marketplace into `dist/apps/vscode-e2e/extensions`. `VSCODE_E2E_EXTENSION_PATH`
accepts a `.vsix` file or an unpacked extension directory. Both work with
`automation-ide` too. VSIX files are extracted with `unzip`, so these options
need macOS or Linux. `VSCODE_E2E_VERSION` selects another VS Code release.

## CI

`.github/workflows/vscode-e2e.yml` runs on pull requests that change VS Code
sources, on Ubuntu and macOS. It runs the harness unit tests, records every
scenario, then launches a persistent automation IDE, inspects it and runs the
smoke scenario against it. Evidence is uploaded as the
`vscode-e2e-<os>-<run id>-<attempt>` artifact. A manual run accepts an Nx
Console `extension-version`, an evidence `label` and a `grep` pattern.

## Scenarios

### Smoke

`specs/smoke.test.ts` opens the `demo` fixture, checks that Nx Console activates
and registers its commands, and expands the `demo` project in the Projects view.

### Nested projects in the Projects tree (#3193)

`specs/nested-projects-tree.test.ts` uses the `nested-projects` fixture:
`e2es/parent` (`parent-e2e`, no targets) with two nested projects,
`e2es/parent-with-target` (`parent-with-target-e2e`, an `e2e` target) with one,
and ten libraries so the `automatic` Projects view style resolves to the folder
tree. It checks that `nx show projects` lists every nested project, expands
`e2es`, and asserts that each parent can be expanded and shows its nested
projects.

References:

- [Playwright `connectOverCDP`](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp)
- [Testing VS Code extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
