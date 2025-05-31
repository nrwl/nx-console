# Guidelines for how to work in Nx Console

- Always verify changes by running tasks through nx (e.g. `yarn nx run ...`) instead of running the tools directly
- Use the `nx_workspace` MCP tool to learn about the workspace if applicable. Default to using other nx MCP tools for answering questions and learning about anything in this workspace or the nx docs when answering questions and solving problems

## Code style & development

- On writing comments:
  - Skip all obvious comments - anything inferrable from function names/context
  - Keep only complex logic explanations - hard-to-understand algorithms or business rules
- Follow existing patterns exactly - Some things to build in one editor integration might already exist in the other. Always check similar implementations in the codebase and match their structure/naming.
- before creating a commit, run `yarn nx format --fix` and if kotlin files were touched, `yarn nx ktfmtFormat intellij` to make sure formatting is applied
