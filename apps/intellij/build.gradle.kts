import org.jetbrains.changelog.Changelog
import org.jetbrains.changelog.markdownToHTML

fun isWindows(): Boolean {
    return System.getProperty("os.name").toLowerCase().startsWith("windows")
}

val nxlsRoot = "${rootDir}/dist/apps/nxls"

buildDir = file("${rootDir}/dist/apps/intellij")

fun properties(key: String) = project.findProperty(key).toString()

plugins {
    // Java support
    id("java")
    // Kotlin support
    id("org.jetbrains.kotlin.jvm") version "1.8.0"
    // Kotlin serialization
    id("org.jetbrains.kotlin.plugin.serialization") version "1.8.0"
    // Gradle IntelliJ Plugin
    id("org.jetbrains.intellij") version "1.12.0"

    // Gradle Changelog Plugin
    id("org.jetbrains.changelog") version "2.0.0"
    // Gradle Qodana Plugin
    id("org.jetbrains.qodana") version "0.1.13"
    // Gradle Kover Plugin
    id("org.jetbrains.kotlinx.kover") version "0.6.1"

    id("com.ncorti.ktfmt.gradle") version "0.11.0"
}

group = properties("pluginGroup")

// Configure project's dependencies
repositories { mavenCentral() }

configurations.all { exclude("org.slf4j", "slf4j-api") }

dependencies {
    implementation("org.eclipse.lsp4j:org.eclipse.lsp4j:0.19.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.6.4")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.4.1")

    val ktorVersion = "2.2.4"
    implementation("io.ktor:ktor-client-core:$ktorVersion")
    implementation("io.ktor:ktor-client-cio:$ktorVersion")
    implementation("io.ktor:ktor-client-content-negotiation:$ktorVersion")
    implementation("io.ktor:ktor-serialization-kotlinx-json:$ktorVersion")
    implementation("io.ktor:ktor-client-logging:$ktorVersion")
}

ktfmt { kotlinLangStyle() }

// Set the JVM language level used to build project. Use Java 11 for 2020.3+, and Java 17 for
// 2022.2+.
kotlin { jvmToolchain(17) }

// Configure Gradle IntelliJ Plugin - read more:
// https://plugins.jetbrains.com/docs/intellij/tools-gradle-intellij-plugin.html
intellij {
    pluginName.set(properties("pluginName"))
    version.set(properties("platformVersion"))
    type.set(properties("platformType"))

    // Plugin Dependencies. Uses `platformPlugins` property from the gradle.properties file.
    plugins.set(
        properties("platformPlugins").split(',').map(String::trim).filter(String::isNotEmpty)
    )
}

// Configure Gradle Changelog Plugin - read more:
// https://github.com/JetBrains/gradle-changelog-plugin
changelog {
    groups.set(emptyList())
    repositoryUrl.set(properties("pluginRepositoryUrl"))
}

// Configure Gradle Qodana Plugin - read more: https://github.com/JetBrains/gradle-qodana-plugin
qodana {
    cachePath.set(file(".qodana").canonicalPath)
    reportPath.set(file("dist/reports/inspections").canonicalPath)
    saveReport.set(true)
    showReport.set(System.getenv("QODANA_SHOW_REPORT")?.toBoolean() ?: false)
}

// Configure Gradle Kover Plugin - read more: https://github.com/Kotlin/kotlinx-kover#configuration
kover.xmlReport { onCheck.set(true) }

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    kotlinOptions { jvmTarget = "17" }
}

tasks {
    runInspections { mount("${rootDir}/gradle.properties", "/data/project/gradle.properties") }

    prepareSandbox {
        dependsOn("buildNxls")
        from(nxlsRoot) {
            include("**/*.js")
            include("**/package.json")
            include("**/*.map")
            into("${rootProject.name}/nxls")
        }

        doLast {
            exec {
                workingDir =
                    File(
                        destinationDir,
                        rootProject.name + "/nxls",
                    )
                commandLine = buildCommands() + "npm install --force"
            }
        }
    }

    patchPluginXml {
        version.set(properties("version"))
        //        sinceBuild.set(properties("pluginSinceBuild"))
        untilBuild.set("")

        // Extract the <!-- Plugin description --> section from README.md and provide for the
        // plugin's manifest
        pluginDescription.set(
            file("README.md")
                .readText()
                .lines()
                .run {
                    val start = "<!-- Plugin description -->"
                    val end = "<!-- Plugin description end -->"

                    if (!containsAll(listOf(start, end))) {
                        throw GradleException(
                            "Plugin description section not found in README.md:\n$start ... $end"
                        )
                    }
                    subList(indexOf(start) + 1, indexOf(end))
                }
                .joinToString("\n")
                .let { markdownToHTML(it) }
        )

        // Get the latest available change notes from the changelog file
        changeNotes.set(
            provider {
                with(changelog) {
                    renderItem(
                        getOrNull(properties("version")) ?: getLatest(),
                        Changelog.OutputType.HTML,
                    )
                }
            }
        )
    }

    // Configure UI tests plugin
    // Read more: https://github.com/JetBrains/intellij-ui-test-robot
    runIdeForUiTests {
        systemProperty("robot-server.port", "8082")
        systemProperty("ide.mac.message.dialogs.as.sheets", "false")
        systemProperty("jb.privacy.policy.text", "<!--999.999-->")
        systemProperty("jb.consents.confirmation.enabled", "false")
    }

    signPlugin {
        certificateChain.set(System.getenv("CERTIFICATE_CHAIN"))
        privateKey.set(System.getenv("PRIVATE_KEY"))
        password.set(System.getenv("PRIVATE_KEY_PASSWORD"))
    }

    publishPlugin {
        dependsOn("patchChangelog")
        token.set(System.getenv("PUBLISH_TOKEN"))
        // version is based on the SemVer (https://semver.org) and supports pre-release
        // labels, like 2.1.7-alpha.3
        // Specify pre-release label to publish the plugin in a custom Release Channel
        // automatically. Read more:
        // https://plugins.jetbrains.com/docs/intellij/deployment.html#specifying-a-release-channel
        channels.set(
            listOf(
                properties("pluginVersion").split('-').getOrElse(1) { "default" }.split('.').first()
            )
        )
    }

    jar {
        dependsOn("copyGenerateUiArtifacts")
        dependsOn("copyGenerateUiV2Artifacts")

        archiveBaseName.set("nx-console")
    }
}

tasks.register<Exec>("buildNxls") {
    commandLine =
        if (System.getenv("IDEA_DEBUG") == "true") {
            buildCommands() + "npx nx run nxls:build:debug"
        } else {
            buildCommands() + "npx nx run nxls:build"
        }
    workingDir = rootDir
}

tasks.register<Exec>("buildGenerateUi") {
    commandLine = buildCommands() + "npx nx run generate-ui:build:production-intellij"
    workingDir = rootDir
}

tasks.register<Exec>("buildGenerateUiV2") {
    commandLine = buildCommands() + "npx nx run generate-ui-v2:build"
    workingDir = rootDir
}

tasks.register<Copy>("copyGenerateUiArtifacts") {
    dependsOn("buildGenerateUi")

    from("${rootDir}/dist/apps/generate-ui")
    include("*.js", "*.css")
    into("${buildDir}/resources/main/generate_ui")
}

tasks.register<Copy>("copyGenerateUiV2Artifacts") {
    dependsOn("buildGenerateUiV2")

    from("${rootDir}/dist/apps/generate-ui-v2")
    include("*.js", "*.css")
    into("${buildDir}/resources/main/generate_ui_v2")
}

tasks.register<DefaultTask>("publish") {
    // does nothing
    group = "publish"
    description = "Placeholder task to workaround the semantic-release plugin"
}

fun buildCommands() =
    if (isWindows()) {
        mutableListOf("pwsh", "-command")
    } else {
        mutableListOf("bash", "-c")
    }
