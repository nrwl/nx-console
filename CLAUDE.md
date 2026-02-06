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

## Running Tests

- when running e2e or unit tests and you want to just run one file, always run via nx but pass in the file as a param. Example: `npx nx run nx-mcp-e2e:e2e-local -- project-details-filter` (this will run any test with project-details-filter in the filename)

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- For understanding the workspace structure, projects, or available tasks, use the `/nx-workspace` skill which provides guidance on exploring Nx workspaces
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` MCP tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.

<!-- nx configuration end-->

## Self-Healing CI

Predefined fix:
If a failed task id contains ":lint", fix it by running linting on the project where it failed with the `--fix` flag. Example: `npx nx run nx-mcp-server:lint --fix` where "nx-mcp-server" is the project the task failed on.
