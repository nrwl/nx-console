# Guidelines for how to work in Nx Console

- Always verify changes by running tasks through nx (e.g. `npx nx run ...`) instead of running the tools directly
- Use the `nx_workspace` MCP tool to learn about the workspace if applicable. Default to using other nx MCP tools for answering questions and learning about anything in this workspace or the nx docs when answering questions and solving problems

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
