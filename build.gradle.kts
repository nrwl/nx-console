group = "dev.nx.console"

layout.buildDirectory = File("dist")

allprojects { apply { plugin("project-report") } }

tasks.register("projectReportAll") {
    // All project reports of subprojects
    allprojects.forEach { dependsOn(it.tasks.get("projectReport")) }

    // All projectReportAll of included builds
    gradle.includedBuilds.forEach { dependsOn(it.task(":projectReportAll")) }
}

tasks.register<DefaultTask>("publish") {
    group = "publish"
    description = "Placeholder task to workaround the semantic-release plugin"
}
