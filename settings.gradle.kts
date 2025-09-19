rootProject.name = "nx-console"

plugins { id("org.gradle.toolchains.foojay-resolver-convention") version "0.7.0" }

include("intellij-models")

project(":intellij-models").projectDir = file("libs/intellij/models")

include("intellij")

project(":intellij").projectDir = file("apps/intellij")
