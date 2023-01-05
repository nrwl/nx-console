rootProject.name = "nx-console"

include("apps:intellij")
project(":apps:intellij").projectDir = file("apps/intellij")

//println(project(":intellij"))
