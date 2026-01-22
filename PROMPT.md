# Ralph Loop: Upgrade Nxls E2E Tests to Nx 22.4

## Objective

Upgrade all nxls end-to-end tests from Nx version 21.3.0 to 22.4. The default version is defined in `libs/shared/e2e-utils/src/lib/utils.ts`.

## State Tracking

Track progress in `.claude/ralph-upgrade-state.json`. Create it if it doesn't exist with this structure:

```json
{
  "defaultVersionUpdated": false,
  "currentTest": null,
  "completedTests": [],
  "pendingTests": [
    "nx-workspace-default",
    "nx-json-completion-default",
    "named-input-link-completion-default",
    "project-link-completion-default",
    "generator-options.default",
    "generator-local-plugin",
    "nx-cloud-default",
    "nx-cloud-onboarding-info-default",
    "parse-target-string.default",
    "pdv-data-default",
    "project-by-path-standalone.default",
    "project-by-path.default",
    "project-folder-tree",
    "package-json-nx-completion.default",
    "target-link-completion-default",
    "interpolated-path-link"
  ],
  "phase": "local",
  "lastPushedCommit": null,
  "iteration": 0
}
```

## Process Overview

**Two-phase approach:**
1. **Local Phase**: Get ALL tests passing locally first, one at a time
2. **CI Phase**: Push to CI and iterate until CI passes

## Phase 1: Local Testing (phase === "local")

### Step 1: Update Default Version (if not done)

If `defaultVersionUpdated` is false:
1. Edit `libs/shared/e2e-utils/src/lib/utils.ts`
2. Change `'21.3.0'` to `'22.4.0'` on line 8
3. Set `defaultVersionUpdated` to true in state file
4. Commit the change:
   ```bash
   git add -A
   git commit -m "chore(e2e): update default Nx version to 22.4"
   ```

### Step 2: Work on Current Test

1. **Pick a test**: If `currentTest` is null, pop the first item from `pendingTests` and set it as `currentTest`

2. **Run the test locally**:
   ```bash
   npx nx run nxls-e2e:e2e-local -- <test-name>
   ```

3. **If test fails**:
   - Analyze the error output
   - Common issues are:
     - Expected targets have changed (new targets added, old ones renamed/removed)
     - Expected project structure has changed
     - Configuration format changes
   - Fix the test file by updating expected values to match Nx 22.4 behavior
   - Re-run the test locally until it passes

4. **If test passes locally**:
   - If there are uncommitted changes for this test, commit them:
     ```bash
     git add -A
     git commit -m "fix(nxls-e2e): update <test-name> for Nx 22.4"
     ```
   - Move `currentTest` to `completedTests`
   - Set `currentTest` to null
   - **Output a non-final return to restart the loop and pick up the next test**

### Step 3: Transition to CI Phase

When `pendingTests` is empty and `currentTest` is null (all tests pass locally):
1. Set `phase` to `"ci"`
2. Push all commits to remote:
   ```bash
   git push origin ralph-upgrades-e2es
   ```
3. Record the commit SHA in `lastPushedCommit`
4. **Output a non-final return to transition to CI monitoring**

## Phase 2: CI Monitoring (phase === "ci")

### Step 1: Spawn CI Monitor Subagent

Use the Task tool to spawn the `nx:nx-ci-monitor` subagent:
```
Task(
  subagent_type: "nx:nx-ci-monitor",
  description: "Monitor CI for ralph-upgrades-e2es",
  prompt: "Monitor CI pipeline for branch ralph-upgrades-e2es. Report status and any failures or self-healing fixes available."
)
```

### Step 2: Handle CI Results

**If CI is still running:**
- Wait for the subagent to report back
- Output status and continue monitoring

**If CI fails:**
- Check if self-healing fixes are available from the subagent output
- If a self-healing fix makes sense (e.g., lint fixes, formatting):
  - Apply the fix using `mcp__plugin_nx_nx-mcp__update_self_healing_fix` with action "APPLY"
  - Wait for CI to re-run
- If the fix doesn't make sense or no self-healing available:
  - Analyze the failure
  - Fix locally and commit
  - Push to remote
  - Continue monitoring

**If CI passes:**
- All tests upgraded and CI green!
- Output: `<promise>UPGRADE COMPLETE</promise>`

## Test Files Reference

Tests are in `apps/nxls-e2e/src/`:
- `completion/nx-json-completion-default.test.ts`
- `completion/package-json-nx-completion.default.test.ts`
- `document-links/interpolated-path-link.test.ts`
- `document-links/named-input-link-completion-default.test.ts`
- `document-links/project-link-completion-default.test.ts`
- `document-links/target-link-completion-default.test.ts`
- `generators/generator-local-plugin.test.ts`
- `generators/generator-options.default.test.ts`
- `nx-cloud/nx-cloud-default.test.ts`
- `nx-cloud/nx-cloud-onboarding-info-default.test.ts`
- `nx-workspace/nx-workspace-default.test.ts`
- `parse-target-string/parse-target-string.default.test.ts`
- `pdv-data/pdv-data-default.test.ts`
- `project-by-path/project-by-path-standalone.default.test.ts`
- `project-by-path/project-by-path.default.test.ts`
- `project-folder-tree/project-folder-tree.test.ts`

## Common Fix Patterns

### Target Changes
If a test expects specific targets and fails, the targets list likely changed between Nx versions. Update the expected targets array to match what Nx 22.4 generates.

Example in `nx-workspace-default.test.ts`:
```typescript
// Old targets for e2e project
['e2e', 'e2e-ci', 'e2e-ci--src/e2e/app.cy.ts', 'lint', 'open-cypress']

// May need to update if Nx 22.4 adds/removes/renames targets
```

### Preset Changes
If workspace creation fails, the preset options may have changed. Check Nx 22.4 docs for valid preset values.

### Schema Changes
If completion/validation tests fail, JSON schemas may have changed. Update expected completions accordingly.

## Important Notes

- Skip `watcher.test.ts` - it's disabled with `xdescribe`
- Run tests with `npx nx run nxls-e2e:e2e-local -- <test-name>` (not the full filename)
- After fixing a test, always verify it passes locally before moving on
- Each iteration should make progress on one test
- Use self-healing CI features when they make sense (lint fixes, formatting, etc.)
- The loop restarts after each local test passes to pick up the next one
