group = "dev.nx.console"

layout.buildDirectory = File("dist")

plugins {
    // Kotlin support
    id("org.jetbrains.kotlin.jvm") version "2.0.20"
    // Gradle IntelliJ Platform Plugin
    id("org.jetbrains.intellij.platform") version "2.1.0"

    id("com.ncorti.ktfmt.gradle") version "0.11.0"
}

// Configure project's dependencies
repositories {
    mavenCentral()

    intellijPlatform { defaultRepositories() }
}

dependencies {
    intellijPlatform {
        intellijIdeaUltimate(providers.gradleProperty("platformVersion"))

        bundledPlugins(
            providers.gradleProperty("platformPlugins").map { plugins ->
                plugins.split(',').map(String::trim).filter(String::isNotEmpty)
            }
        )
        pluginVerifier()
        zipSigner()
        instrumentationTools()
    }
}


tasks { wrapper { gradleVersion = project.findProperty("gradleVersion").toString() } }

allprojects {
  apply {
      plugin("project-report")
      plugin("org.jetbrains.kotlin.jvm")
      plugin("com.ncorti.ktfmt.gradle")
  }
}

tasks.register("projectReportAll") {
    // All project reports of subprojects
    allprojects.forEach {
        dependsOn(it.tasks.get("projectReport"))
    }

    // All projectReportAll of included builds
    gradle.includedBuilds.forEach {
        dependsOn(it.task(":projectReportAll"))
    }
}