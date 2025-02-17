group = "dev.nx.console"

layout.buildDirectory = File("dist")

plugins {
  // Kotlin support
  id("org.jetbrains.kotlin.jvm") version "2.0.20" apply false
  id("com.ncorti.ktfmt.gradle") version "0.11.0"
}

allprojects {
  plugins.apply("java")
  plugins.apply("org.jetbrains.kotlin.jvm")
  plugins.apply("com.ncorti.ktfmt.gradle")
}

tasks { wrapper { gradleVersion = project.findProperty("gradleVersion").toString() } }

allprojects {
  apply {
    plugin("project-report")
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
