rootProject.name = "nx-console"

plugins { id("org.gradle.toolchains.foojay-resolver-convention") version "0.7.0" }

include("apps:intellij")
include("libs:intellij:utils")
include("libs:intellij:nxls")
include("libs:intellij:console_bundle")
include("libs:intellij:models")
include("libs:intellij:settings")
include("libs:intellij:settings_provider")
include("libs:intellij:icons")
include("libs:intellij:ide")
include("libs:intellij:project")
include("libs:intellij:generate")
include("libs:intellij:telemetry")
include("libs:intellij:notifier")
include("libs:intellij:graph")
include("libs:intellij:project_details")
include("libs:intellij:nx_toolwindow")
include("libs:intellij:run")
include("libs:intellij:completion")