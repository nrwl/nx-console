group = "dev.nx.console"

layout.buildDirectory = File("dist")

plugins {
    id("dev.nx.gradle.project-graph") version "0.1.8"
    id("com.ncorti.ktfmt.gradle") version "0.11.0"

    // Java support
    id("java")
    // Kotlin support
    id("org.jetbrains.kotlin.jvm") version "2.0.21"
    // Kotlin serialization
    id("org.jetbrains.kotlin.plugin.serialization") version "2.0.21"
    id("org.jetbrains.intellij.platform") version "2.9.0"
}

allprojects {
    apply {
        plugin("dev.nx.gradle.project-graph")
        plugin("com.ncorti.ktfmt.gradle")
        plugin("org.jetbrains.kotlin.jvm")
        plugin("org.jetbrains.intellij.platform")
    }
}

tasks {
    register<DefaultTask>("publish") {
        group = "publish"
        description = "Placeholder task to workaround the semantic-release plugin"
    }
}
