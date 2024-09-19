import org.jetbrains.changelog.Changelog
import org.jetbrains.changelog.markdownToHTML
import org.jetbrains.intellij.platform.gradle.tasks.RunIdeTask
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

fun isWindows(): Boolean {
    return System.getProperty("os.name").lowercase().startsWith("windows")
}

val nxlsRoot = "${rootDir}/dist/apps/nxls"

layout.buildDirectory = file("${rootDir}/dist/apps/intellij")

plugins {
    // Java support
    id("java")
    // Kotlin support
    id("org.jetbrains.kotlin.jvm") version "2.0.20"
    // Kotlin serialization
    id("org.jetbrains.kotlin.plugin.serialization") version "2.0.20"
    // Gradle IntelliJ Platform Plugin
    id("org.jetbrains.intellij.platform") version "2.0.1"

    // Gradle Changelog Plugin
    id("org.jetbrains.changelog") version "2.0.0"
    // Gradle Qodana Plugin
    id("org.jetbrains.qodana") version "0.1.13"
    // Gradle Kover Plugin
    id("org.jetbrains.kotlinx.kover") version "0.6.1"

    id("com.ncorti.ktfmt.gradle") version "0.11.0"
}

group = providers.gradleProperty("pluginGroup").get()

version = providers.gradleProperty("version").get()

// Configure project's dependencies
repositories {
    mavenCentral()

    intellijPlatform { defaultRepositories() }
}

configurations.all {
    exclude("org.slf4j", "slf4j-api")
    exclude("org.jetbrains.kotlin", "kotlin-stdlib-jdk7")
    exclude("org.jetbrains.kotlin", "kotlin-stdlib-jdk8")
    exclude("org.jetbrains.kotlin", "kotlin-stdlib-common")
    exclude("org.jetbrains.kotlinx", "kotlinx-coroutines-jdk8")
    exclude("org.jetbrains.kotlinx", "kotlinx-coroutines-core")
}

dependencies {
    implementation("org.eclipse.lsp4j:org.eclipse.lsp4j:0.23.1")

    val ktorVersion = "2.3.12"
    implementation("io.ktor:ktor-client-core:$ktorVersion")
    implementation("io.ktor:ktor-client-cio:$ktorVersion")
    implementation("io.ktor:ktor-client-content-negotiation:$ktorVersion")
    implementation("io.ktor:ktor-serialization-kotlinx-json:$ktorVersion")
    implementation("io.ktor:ktor-client-logging:$ktorVersion")

    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.2")

    implementation("io.github.z4kn4fein:semver:2.0.0")

    intellijPlatform {
        intellijIdeaUltimate(providers.gradleProperty("platformVersion"))

        bundledPlugins(
            providers.gradleProperty("platformPlugins").map { plugins ->
                plugins.split(',').map(String::trim).filter(String::isNotEmpty)
            }
        )
        pluginVerifier()
        zipSigner()
        instrumentationTools()
    }
}

ktfmt { kotlinLangStyle() }

kotlin { jvmToolchain(17) }

intellijPlatform {
    projectName = providers.gradleProperty("pluginName").get()

    pluginConfiguration {
        version = providers.gradleProperty("version").get()
        ideaVersion {
            sinceBuild = providers.gradleProperty("pluginSinceBuild").get()
            untilBuild = providers.gradleProperty("pluginUntilBuild").get()
        }
        description =
            providers.fileContents(layout.projectDirectory.file("README.md")).asText.map {
                val start = "<!-- Plugin description -->"
                val end = "<!-- Plugin description end -->"

                with(it.lines()) {
                    if (!containsAll(listOf(start, end))) {
                        throw GradleException(
                            "Plugin description section not found in README.md:\n$start ... $end"
                        )
                    }
                    subList(indexOf(start) + 1, indexOf(end))
                        .joinToString("\n")
                        .let(::markdownToHTML)
                }
            }

        val changelog = project.changelog // local variable for configuration cache compatibility
        // Get the latest available change notes from the changelog file
        changeNotes =
            providers.gradleProperty("version").map { pluginVersion ->
                with(changelog) {
                    renderItem(
                        (getOrNull(pluginVersion) ?: getUnreleased())
                            .withHeader(false)
                            .withEmptySections(false),
                        Changelog.OutputType.HTML,
                    )
                }
            }
    }
    signing {
        certificateChain.set(System.getenv("CERTIFICATE_CHAIN"))
        privateKey.set(System.getenv("PRIVATE_KEY"))
        password.set(System.getenv("PRIVATE_KEY_PASSWORD"))
    }
    publishing {
        token.set(System.getenv("PUBLISH_TOKEN"))
        // version is based on the SemVer (https://semver.org) and supports pre-release
        // labels, like 2.1.7-alpha.3
        // Specify pre-release label to publish the plugin in a custom Release Channel
        // automatically. Read more:
        // https://plugins.jetbrains.com/docs/intellij/deployment.html#specifying-a-release-channel
        //        val channel: String =
        //            properties("pluginVersion").split('-').getOrElse(1) { "default"
        // }.split('.').first()
        //        channels.set(listOf(channel))
    }
    pluginVerification { ides { recommended() } }
}

intellijPlatformTesting {
    runIde {
        create("runIntelliJLatest") {
            version = "243.12818.47"
            prepareSandboxTask {
                from(nxlsRoot) {
                    include("**/*.js")
                    include("**/package.json")
                    include("**/*.map")
                    into(intellijPlatform.projectName.map { "$it/nxls" }.get())
                }
                doLast {
                    exec {
                        workingDir =
                            File(
                                destinationDir,
                                intellijPlatform.projectName.map { "$it/nxls" }.get(),
                            )
                        commandLine = buildCommands() + "npm install --force"
                    }
                }
            }
        }
    }
}

// Configure Gradle Changelog Plugin - read more:
// https://github.com/JetBrains/gradle-changelog-plugin
changelog {
    groups.set(emptyList())
    repositoryUrl.set(providers.gradleProperty("pluginRepositoryUrl").get())
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
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

tasks {
    runInspections { mount("${rootDir}/gradle.properties", "/data/project/gradle.properties") }

    prepareSandbox() {
        from(nxlsRoot) {
            include("**/*.js")
            include("**/package.json")
            include("**/*.map")
            into(intellijPlatform.projectName.map { "$it/nxls" }.get())
        }
        doLast {
            exec {
                workingDir =
                    File(destinationDir, intellijPlatform.projectName.map { "$it/nxls" }.get())
                commandLine = buildCommands() + "npm install --force"
            }
        }
    }

    jar {
        dependsOn("copyGenerateUiV2Artifacts")
        archiveBaseName.set("nx-console")
    }

    instrumentedJar { dependsOn("copyGenerateUiV2Artifacts") }

    withType<RunIdeTask> { maxHeapSize = "6g" }
}

tasks.register<Copy>("copyGenerateUiV2Artifacts") {
    from("${rootDir}/dist/apps/generate-ui-v2")
    include("*.js", "*.css")
    into(layout.buildDirectory.file("resources/main/generate_ui_v2"))
}

tasks.register<DefaultTask>("publish") {
    // does nothing
    group = "publish"
    description = "Placeholder task to workaround the semantic-release plugin"
}

fun buildCommands() =
    if (isWindows()) {
        mutableListOf("powershell", "-command")
    } else {
        mutableListOf("bash", "-c")
    }
