<p align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/nrwl/nx-console/master/static/nx-console-dark.png">
        <img alt="Nx Console - The UI for Nx & Lerna" src="https://raw.githubusercontent.com/nrwl/nx-console/master/static/nx-console-light.png" width="100%">
    </picture>
</p>

<div align="center">

# The UI for Nx & Lerna

**Stay focused and productive right in your editor.**

[![CI Status](https://img.shields.io/github/actions/workflow/status/nrwl/nx-console/ci_checks.yml?branch=master&label=CI&logo=github&style=flat-square)](https://github.com/nrwl/nx-console/actions/workflows/ci_checks.yml)
[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/nrwl.angular-console?style=flat-square&label=Visual%20Studio%20Code%20extension&logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=nrwl.angular-console)
[![JetBrains Plugin Version](https://img.shields.io/jetbrains/plugin/v/dev.nx.console?style=flat-square&label=JetBrains%20plugin&logo=jetbrains)](https://plugins.jetbrains.com/plugin/21060-nx-console)
[![GitHub](https://img.shields.io/github/license/nrwl/nx-console?style=flat-square)](https://github.com/nrwl/nx-console/blob/master/LICENSE)
![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/nrwl.angular-console?style=flat-square)
[![Visual Studio Code Support](https://img.shields.io/badge/Visual%20Studio%20Code-%5E1.71.0-blue?style=flat-square&logo=visualstudiocode)](https://code.visualstudio.com)

</div>

<hr>

<picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/nrwl/nx-console/master/static/nx-console-ui-dark.png">
        <img alt="Nx Console - The UI for Nx & Lerna" src="https://raw.githubusercontent.com/nrwl/nx-console/master/static/nx-console-ui-light.png" width="100%">
    </picture>

## Why Nx Console?

Developers use both command-line tools and user interfaces. They commit in the terminal, but resolve conflicts in Visual Studio Code or WebStorm. They use the right tool for the job.

Nx Console is that tool. It helps developers stay in the flow and unlocks new workflows.

## Installation

You can download Nx Console from the following places:

- [Nx Console for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=nrwl.angular-console) from the Visual Studio Marketplace.
- [Nx Console for Visual Studio Code](https://open-vsx.org/extension/nrwl/angular-console) from the OpenVSX Registry
- [Nx Console for JetBrains](https://plugins.jetbrains.com/plugin/21060-nx-console) from the JetBrains Marketplace

## Key Features

### AI Enhancements

Nx Console enhances your editors AI features by providing relevant context to the large language models powering VSCode and Cursor. Automatically teach AI about your workspace architecture, generators and feed it up-to-date nx docs!

[PLACEHOLDER FOR LLM INTEGRATION GIF]

In VSCode, access the enhancements via the `@nx` chat participant. Learn more [in our blog post](https://nx.dev/blog/nx-just-made-your-llm-smarter) or the [Nx docs](https://nx.dev/features/enhance-AI#vs-code-with-github-copilot)

In Cursor or anywhere else, use the Nx MCP server. Learn more [in our Cursor blog](https://nx.dev/blog/nx-made-cursor-smarter) post or [watch the announcement video](https://www.youtube.com/watch?v=V2W94Sq_v6A)

### Project Details View

Nx Console provides seamless integration with the Project Details View (PDV). You can learn more about your project, the available tasks and detailed configuration information. With the PDV in Nx Console, you can run tasks or navigate the task graph with just a few clicks!

<p align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/nrwl/nx-console/readme-update/static/pdv-demo.gif">
        <img alt="Nx Console - The UI for Nx & Lerna" src="https://raw.githubusercontent.com/nrwl/nx-console/readme-update/static/pdv-demo.gif" width="100%">
    </picture>
</p>

[Learn more about the Project Details view on nx.dev](https://nx.dev/recipes/nx-console/console-project-details#nx-console-project-details-view)

### Generate UI

Nx Console makes it easier to run generators through our interactive Generate UI. It automatically parses the schema for any generator and provides autocomplete, validation and dry-run previews as you type.

[PLACEHOLDER FOR GENERATE UI GIF]

You can launch the Generate UI via the `Nx: Generate (UI)` command or through the context menu in the file explorer. Paths will be automatically prefilled! [Learn more about the Generate UI on nx.dev](https://nx.dev/recipes/nx-console/console-generate-command)

### Nx Cloud Integration

Nx Console improves the experience of using Nx Cloud by giving you an overview of current CI Pipeline Executions and showing notifications when CI is done or an error occurs. No more refreshing GitHub forever, just keep working and Nx Console will let you know once your PR is ready!

[PLACEHOLDER FOR NX CLOUD INTEGRATION GIF]

Additionally, Nx Console helps by guiding you through the Nx Cloud onboarding process, right in your editor.

[Learn more about the Nx Cloud Integratino on nx.dev](https://nx.dev/recipes/nx-console/console-nx-cloud)

### Projects View & Running Tasks

Nx Console presents an overview of your workspace from an Nx perspective. You can browse projects, their targets & configurations in the Projects view. Run available targets or create shortcuts for frequent commands in the `Common Nx Commands` view.

[PLACEHOLDER FOR TASK RUNNING GIF]

### Nx Graph Integration

Nx Console visualizes the Nx project & task graphs right in your editor. It knows which file you're working on, so you can easily open the graph focused on that specific project. Also, with the tight integration into your editor, you can run tasks or explore the files that cause project dependencies with a single click.

[PLACEHOLDER FOR NX GRAPH GIF]

## Useful for Both Experts and Beginners

Nx Console provides value to any developer, whether expert or beginner. For example, you can

- Gain a quick overview of the workspace using the Projects View, integrated Graph or letting enhanced AI models answer your questions.
- Debug complex configuration issues using the Project Details View and get help from enhanced AI models using the latest documentation updates.
- Discover available generators & their options in an easy-to-use and intuitive UI.
- Remove friction from your workflows through smart codelenses, context menu actions and relevant notifications.

## Compatibility

The latest version of Nx Console supports all Nx versions starting at Nx 15. For older versions, we cannot guarantee compatibility or full functionality. However, we welcome contributions! If you encounter specific issues with older versions, please consider submitting a PR. Of course, if you discover any problems with newer versions of Nx, please report these issues to help us improve Nx Console.
If you're looking to upgrade your version of Nx easily, refer to the [Nx
migrate documentation](https://nx.dev/features/automate-updating-dependencies).

## Learn More

- [Documentation](https://nx.dev/getting-started/editor-setup) - Official documentation with video tutorials
- [nx.dev](http://nx.dev) - Documentation, Guides and Interactive Tutorials on Nx
- [Join the community](http://go.nx.dev/community) - Chat about Nx & Nx Console on the official discord server
- [Learn more about the team at Nx](https://nx.dev/company) - The team at Nx led the development of Nx Console,
  after working with many Enterprise clients.

# Contributing

Please read the [contributing guidelines](https://github.com/nrwl/nx-console/blob/master/CONTRIBUTING.md). Pick one of
the issues from
the [good first issue](https://github.com/nrwl/nx-console/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22)
list to get started.

### Jetbrains WSL support

The Node interpreter under **Languages & Frameworks** > **Node.js** needs to be configured to use the Node executable
within the WSL distribution.
You can read more on
the [official Jetbrains docs page](https://www.jetbrains.com/help/webstorm/how-to-use-wsl-development-environment-in-product.html#ws_wsl_node_interpreter_configure).
