# Guidelines for how to work in Nx Console

## Code style & development

- On writing comments:
  - Skip all obvious comments - anything inferrable from function names/context
  - Keep only complex logic explanations - hard-to-understand algorithms or business rules
- Follow existing patterns exactly - Some things to build in one editor integration might already exist in the other. Always check similar implementations in the codebase and match their structure/naming.
- **Kotlin/IntelliJ code**: Always use direct imports instead of fully qualified names
  - ❌ Bad: `dev.nx.console.utils.ProjectLevelCoroutineHolderService.getInstance(project)`
  - ✅ Good: Import `dev.nx.console.utils.ProjectLevelCoroutineHolderService` at the top, then use `ProjectLevelCoroutineHolderService.getInstance(project)`
  - This applies to all classes from the `dev.nx.console.*` packages and other packages
  - Exception: Only use fully qualified names when there are naming conflicts that cannot be resolved with import aliases
- before creating a commit, run `npx nx format --fix` and if kotlin files were touched, `npx nx run-many -t ktfmtFormat` to make sure formatting is applied
- when working from a plan and creating a set of commits, always pause after you have implemented one section or one commit worth of code. Ask me for feedback and wait for me to confirm your code is right. I will commit the code myself and prompt you to continue

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
