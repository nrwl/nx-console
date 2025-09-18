rootProject.name = "nx-console"

plugins { id("org.gradle.toolchains.foojay-resolver-convention") version "0.7.0" }

includeBuild("apps/intellij")

includeBuild("/Users/lourw/nrwl/nx/packages/gradle/project-graph")

