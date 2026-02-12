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
    id("dev.nx.gradle.project-graph") version ("0.1.12")
    id("java")
    id("org.jetbrains.changelog") version "2.4.0"
    id("org.jetbrains.intellij.platform") version "2.11.0"
}

group = providers.gradleProperty("pluginGroup").get()

version = providers.gradleProperty("version").get()

// Configure project's dependencies
repositories { intellijPlatform { defaultRepositories() } }

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
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")

    implementation("io.github.z4kn4fein:semver:2.0.0")

    implementation("io.github.nsk90:kstatemachine:0.31.0")
    implementation("io.github.nsk90:kstatemachine-coroutines:0.31.0")

    // Add Kotlin test dependency
    testImplementation(kotlin("test"))
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
    testImplementation("junit:junit:4.13.2")

    intellijPlatform {
        val type = providers.gradleProperty("platformType")
        val version = providers.gradleProperty("platformVersion")
        create(type, version) { useCache = true }

        bundledPlugins(
            providers.gradleProperty("platformPlugins").map { plugins ->
                plugins.split(',').map(String::trim).filter(String::isNotEmpty)
            }
        )
        if (System.getenv("CI") == null) {
            pluginVerifier()
        }
        zipSigner()
        // Add test framework configuration
        testFramework(org.jetbrains.intellij.platform.gradle.TestFrameworkType.Platform)
    }
    implementation(project(":intellij-models"))
}

ktfmt { kotlinLangStyle() }

kotlin { jvmToolchain(21) }

intellijPlatform {
    projectName = providers.gradleProperty("pluginName").get()

    pluginConfiguration {
        version = providers.gradleProperty("version").get()
        ideaVersion { sinceBuild = providers.gradleProperty("pluginSinceBuild").get() }
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
    if (System.getenv("CI") == null) {
        pluginVerification { ides { recommended() } }
    }
}

if (System.getenv("CI") == null) {
    intellijPlatformTesting {
        runIde {
            create("runIntelliJLatest") {
                version = "2025.2.1"
                prepareSandboxTask {
                    from(nxlsRoot) {
                        include("**")
                        include("**/**")
                        into(intellijPlatform.projectName.map { "$it/nxls" }.get())
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

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_21)
        freeCompilerArgs.add("-Xskip-metadata-version-check")
    }
}

// --- Disk space investigation (temporary) ---
fun logDiskSpace(label: String) {
    if (System.getenv("CI") != null) {
        println("=== DISK SPACE: $label ===")
        exec { commandLine("df", "-h") }
        exec { commandLine("sh", "-c", "du -sh ~/.gradle 2>/dev/null || true") }
        exec { commandLine("sh", "-c", "du -sh ~/.gradle/caches 2>/dev/null || true") }
        exec { commandLine("sh", "-c", "du -sh ~/.cache/intellij-platform 2>/dev/null || true") }
        exec {
            commandLine(
                "sh",
                "-c",
                "du -sh ${layout.buildDirectory.get().asFile.absolutePath}/* 2>/dev/null | sort -rh | head -20 || true",
            )
        }
        exec {
            commandLine(
                "sh",
                "-c",
                "du -sh ${rootDir}/dist/* 2>/dev/null | sort -rh | head -20 || true",
            )
        }
        exec {
            commandLine(
                "sh",
                "-c",
                "find ~/.gradle ~/.cache ${rootDir}/dist -size +100M -exec ls -lh {} \\; 2>/dev/null | head -20 || true",
            )
        }
        println("=== END DISK SPACE: $label ===")
    }
}

// --- End disk space investigation ---

tasks {
    prepareSandbox() {
        from(nxlsRoot) {
            include("**")
            include("**/**")
            into(intellijPlatform.projectName.map { "$it/nxls" }.get())
        }
        doFirst { logDiskSpace("prepareSandbox START") }
        doLast { logDiskSpace("prepareSandbox END") }
    }

    jar {
        dependsOn("copyGenerateUiV2Artifacts", "copyCloudFixWebviewArtifacts")
        archiveBaseName.set("nx-console")
    }

    withType<RunIdeTask> { maxHeapSize = "6g" }

    test {
        useJUnit()
        include("**/*Test.class")

        testLogging {
            events("passed", "skipped", "failed", "standardOut", "standardError")
            showExceptions = true
            showStackTraces = true
            showCauses = true
            exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
        }
    }

    named("buildPlugin") {
        doFirst { logDiskSpace("buildPlugin START") }
        doLast { logDiskSpace("buildPlugin END") }
    }

    named("buildSearchableOptions") {
        doFirst { logDiskSpace("buildSearchableOptions START") }
        doLast { logDiskSpace("buildSearchableOptions END") }
    }
}

tasks.register<Copy>("copyGenerateUiV2Artifacts") {
    from("${rootDir}/dist/apps/generate-ui-v2")
    include("*.js", "*.css")
    into(layout.buildDirectory.file("resources/main/generate_ui_v2"))
}

tasks.register<Copy>("copyCloudFixWebviewArtifacts") {
    from("${rootDir}/dist/libs/shared/cloud-fix-webview")
    include("*.js", "*.css", "*.html", "assets/**")
    into(layout.buildDirectory.file("resources/main/cloud_fix_webview"))
}

tasks.register<DefaultTask>("publish") {
    // does nothing
    group = "publish"
    description = "Placeholder task to workaround the semantic-release plugin"
}

allprojects { apply { plugin("dev.nx.gradle.project-graph") } }
