group = "dev.nx.console"
buildDir = File("dist")

tasks {
    wrapper {
        gradleVersion = project.findProperty("gradleVersion").toString()
    }
}


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