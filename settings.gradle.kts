rootProject.name = "nx-console"

plugins { id("org.gradle.toolchains.foojay-resolver-convention") version "0.7.0" }

include("apps:intellij")
include("libs:intellij:models")

project(":apps:intellij").projectDir =
    file(
        "apps/intellij"
    )

