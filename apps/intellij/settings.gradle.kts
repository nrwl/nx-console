rootProject.name = "intellij-app"

include("libs:intellij:models")

project(":libs").projectDir =
    file(
        "../../libs"
    )

project(":libs:intellij").projectDir =
    file(
        "../../libs/intellij"
    )

project(":libs:intellij:models").projectDir =
    file(
        "../../libs/intellij/models"
    )

