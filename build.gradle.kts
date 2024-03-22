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
