group = "dev.nx.console"

layout.buildDirectory = File("dist")

plugins {
  id("dev.nx.gradle.project-graph") version "0.1.9"
  id("com.ncorti.ktfmt.gradle") version "0.24.0"

  id("org.jetbrains.kotlin.jvm") version "2.2.0"
  id("org.jetbrains.kotlin.plugin.serialization") version "2.2.0"
}

allprojects {
  repositories {
    mavenLocal()
    mavenCentral()
    gradlePluginPortal()
  }

  apply {
    plugin("dev.nx.gradle.project-graph")
    plugin("com.ncorti.ktfmt.gradle")
    plugin("org.jetbrains.kotlin.jvm")
    plugin("org.jetbrains.kotlin.plugin.serialization")
  }
}

tasks {
  register<DefaultTask>("publish") {
    group = "publish"
    description = "Placeholder task to workaround the semantic-release plugin"
  }
}
