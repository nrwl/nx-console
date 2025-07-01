plugins {
	id("dev.nx.gradle.project-graph") version "0.1.0"
}

group = "dev.nx.console"

layout.buildDirectory = File("dist")

allprojects { apply { plugin("dev.nx.gradle.project-graph") } }

tasks.register<DefaultTask>("publish") {
    group = "publish"
    description = "Placeholder task to workaround the semantic-release plugin"
}
