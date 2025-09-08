---
name: '🪳 Bug Report'
about: Report a bug
labels: 'type: bug'
---

<!-- Please do your best to fill out all of the sections below! -->

## Current Behavior

<!-- What is the behavior that currently you experience? -->

## Expected Behavior

<!-- What is the behavior that you expect to happen? -->
<!-- Is this a regression? .i.e Did this used to be the behavior at one point?  -->

## Steps to Reproduce

<!-- ⚠️ IMPORTANT: A clear reproduction is essential for us to fix the issue! -->

<!-- Please provide one of the following (in order of preference): -->
<!-- 1. Can you reproduce this on https://github.com/nrwl/nx-examples? If so, open a PR with your changes and link it below. -->
<!-- 2. Provide a minimal GitHub repository that reproduces the issue -->
<!-- 3. At minimum, provide detailed step-by-step instructions to reproduce the issue -->

**Reproduction Repository/Steps:**

### Logs (Required)

<!-- ⚠️ CRITICAL: Please include logs! They are essential for debugging. -->

**For VS Code users:**

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Go to `View: Toggle Output`
3. Select `Nx Console` from the dropdown
4. Also select `Nx Language Server` from the dropdown
5. Paste both outputs below

**For JetBrains IDE users (IntelliJ, WebStorm, etc.):**

1. Enable verbose logging:
   - Go to `Help` → `Diagnostic Tools` → `Debug Log Settings...`
   - Add: `#dev.nx.console:trace`
   - Click `OK` and restart the IDE
2. Reproduce the issue
3. Access logs via `Help` → `Show Log in Explorer` (Windows) / `Show Log in Finder` (macOS) / `Show Log in Files` (Linux)
4. Look for `idea.log` file and paste relevant sections below

**Log Output:**

```
<!-- Paste your logs here -->
```

### Environment

<!-- It's important for us to know the context in which you experience this behavior! -->
<!-- Please paste the result of `nx report` below! If not available, include package.json dependencies -->

- Nx Console version:
- IDE version (VS Code/IntelliJ/WebStorm/etc):
- Operating System (Windows/macOS/Linux):
- Node.js version:

**Nx Report:**

```
<!-- Run `nx report` and paste output here -->
```
