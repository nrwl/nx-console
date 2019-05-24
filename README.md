<p align="center">
    <img src="https://raw.githubusercontent.com/nrwl/angular-console/master/static/angular-console-logo-with-text.jpg" width="256"/>
</p>

# The UI for the Angular CLI

[![Angular Console Website](https://img.shields.io/badge/Angular-Console-blue.png)](https://angularconsole.org/)
[![Build Status](https://circleci.com/gh/nrwl/angular-console/tree/master.png)](https://circleci.com/gh/nrwl/angular-console/tree/master)
[![License](https://img.shields.io/npm/l/@nrwl/schematics.png)](https://opensource.org/licenses/MIT)

<hr>

<p align="center">
  <a href="https://hubs.ly/H0hWwWd0" target="_blank">  
    <img 
         width="728"
         src="https://images.ctfassets.net/8eyogtwep6d2/4FZPkA6lK3IEwJFlmfB47/4b5fef4738d4b23c41007329fca37ad0/nrwl-connect-banner-with-shadow.png?w=1024"  
         alt="Nrwl Connect platform">
  </a>
</p>

<hr>

### Spend less time looking up command line arguments and more time shipping incredible products.

<img src="https://raw.githubusercontent.com/nrwl/angular-console/master/static/angular-console-plugin.gif">

Angular CLI transformed the Angular ecosystem. With it, you can get a full-stack application up and running in minutes, no need to figure out source maps, webpack, test runners. It all works out of the box. Angular CLI also helps you enforce consistent development practices by generating components, services, and state management modules.

## Why Angular Console?

Professional developers use both command-line tools and user interfaces. They commit in the terminal, but resolve conflicts in VSCode or WebStorm. They use the right tool for the job.

Angular CLI is a command-line tool, which works great when you want to serve an application or generate a simple component. But it falls short once you start doing advanced things.

For instance:

* Exploring custom schematic collections is hard in the terminal, but it's easy using Angular Console.
* Using rarely-used flags is challenging. Do you pass absolute or relative paths? You don't have to remember any flags, names, or paths -- Angular Console will help you by providing autocompletion and validating your inputs.
* Finding the right Angular CLI extension can take a long time. When using Angular Console, you can find and install an extension in minutes.


Angular Console does more than that:

* It visualizes the results of a build or a test run.
* It visualizes how different projects in your workspace depend on each other.
* It shows dry run results as you create your command
* It shows remembers you most recent cli commands and saves their output for your reference
* ...


## Download

* If you are a VSCode user, the best way to try Angular Console is by installing the [Angular Console VSCode Plugin](https://marketplace.visualstudio.com/items?itemName=nrwl.angular-console).

* If you aren't a VSCode user, download a standalone desktop application at [angularconsole.com](https://angularconsole.com).



## True UI for the Angular CLI

Angular Console is a generic UI for the Angular CLI. It will work for any schematic or any architect commands. Angular Console does not have a specific UI for, say, generating a component. Instead, Angular Console does what the command-line version of the Angular CLI does--it analyzes the same meta information to create the needed UI. This means that anything you can do with the Angular CLI, you can do with Angular Console. After all, Angular Console is the UI for the Angular CLI.


## Useful for Both Experts and Beginners

Even though we started building Angular Console as a tool for expert, we also aimed to make Angular Console a great tool for developers who are new to Angular or Angular CLI. You can create projects, interact with your editor, run generators and commands, install extensions without ever touching the terminal or having to install any node packages globally. If you get a new laptop, you can install Angular Console and start building Angular apps. Also, Angular Console highlights the properties you are likely to use for build-in generators and commands . So if you haven't used the CLI, you don't get overwhelmed.

## Great for Windows Users

A lot of Windows users are terminal shy and cannot take full advantage of tools like the Angular CLI and [Nrwl Nx](http://nrwl.io/nx). By using Angular Console, Windows users can start using the powerful capabilities these tools provide via an easy-to-use UI. They can create new projects, generate components, build, test, deploy Angular apps without having to even open the terminal.


# Learn More

- [angularconsole.com](http://angularconsole.com) - the official site of the project
- [Watch Angular Console 5-minute overview video by Angular Firebase folks](https://www.youtube.com/watch?time_continue=18&v=d2K2Cp8BJx0)
- [Angular CLI course by John Papa](https://www.pluralsight.com/courses/angular-cli) - the Angular CLI course by John Papa has a video on Angular Console
- [Learn more about the team at Nrwl](https://www.nrwl.io) - The team at Nrwl led the development of Angular Console, after working with many Enterprise clients.

# Contribute

Please read the [contributing](https://github.com/nrwl/angular-console/blob/master/CONTRIBUTING.md) guidelines.
Pick one of the issues from the [good first issue](https://github.com/nrwl/angular-console/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22) list to get started.

## Core Team

| Dan Muller | Victor Savkin | Jack Hsu | Frantisek Kolar | Kamil Kisiela |
| ---------- | ------------- | -------- | -------------- | ------------- |
| ![Dan Muller][DM] | ![Victor Savkin][VS] | ![Jack Hsu][JH] | ![Frantisek Kolar][FK] | ![Kamil Kisiela][KK] |
| [mrmeku](https://github.com/mrmeku) | [vsavkin](https://github.com/vsavkin) | [jaysoo](https://github.com/jaysoo) | [fkolar](https://github.com/fkolar) | [kamilkisiela](https://github.com/kamilkisiela) |

[DM]: https://raw.githubusercontent.com/nrwl/angular-console/master/static/dan_pic.jpg
[VS]: https://raw.githubusercontent.com/nrwl/angular-console/master/static/victor_pic.jpg
[JH]: https://raw.githubusercontent.com/nrwl/angular-console/master/static/jack_pic.jpg
[FK]: https://avatars0.githubusercontent.com/u/17149942?s=150&v=4
[KK]: https://avatars1.githubusercontent.com/u/8167190?s=150&v=4

The following folks from the Angular team at Google are working with the Angular Console team.

| Alex Eagle | Stephen Fluin | Matias Niemelä |
| ---------- | ------------- | -------------- |
| ![Alex Eagle][AE] | ![Stephen Fluin][SF] | ![Matias Niemelä][MN] |

[AE]: https://raw.githubusercontent.com/nrwl/angular-console/master/static/alex_eagle_pic.jpg
[SF]: https://raw.githubusercontent.com/nrwl/angular-console/master/static/stephen_pic.jpg
[MN]: https://raw.githubusercontent.com/nrwl/angular-console/master/static/matias_pic.jpg
