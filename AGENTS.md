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

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->
