rootProject.name = "nx-console"

plugins { id("org.gradle.toolchains.foojay-resolver-convention") version "0.7.0" }

include("apps:intellij")

project(":apps:intellij").projectDir =
    file(
        "apps/intellij"
    )

// println(project(":intellij"))
