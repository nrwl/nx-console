group = "dev.nx.console"

layout.buildDirectory = File("dist")

plugins {
    id("dev.nx.gradle.project-graph") version "0.1.8"
}

allprojects {
    apply {
        plugin("dev.nx.gradle.project-graph")
    }
}

tasks {
    register<DefaultTask>("publish") {
        group = "publish"
        description = "Placeholder task to workaround the semantic-release plugin"
    }

    register("clean") {
        description = "Cleans all included builds"
        dependsOn(gradle.includedBuilds.map { it.task(":clean") })
        doLast { println("Cleaned ${gradle.includedBuilds.size} included builds") }
    }

    register("testClasses") {
        description = "Compiles test classes for all included builds"
        dependsOn(gradle.includedBuilds.map { it.task(":testClasses") })
        doLast {
            println("Compiled test classes for ${gradle.includedBuilds.size} included builds")
        }
    }
}
