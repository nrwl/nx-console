import java.time.Duration
import org.intellij.markdown.flavours.gfm.GFMFlavourDescriptor
import org.intellij.markdown.html.HtmlGenerator
import org.intellij.markdown.parser.MarkdownParser
import org.jetbrains.intellij.platform.gradle.tasks.RunIdeTask
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

buildscript {
    repositories { mavenCentral() }
    dependencies { classpath("org.jetbrains:markdown:0.7.3") }
}

fun isWindows(): Boolean {
    return System.getProperty("os.name").lowercase().startsWith("windows")
}

fun markdownToHTML(markdown: String): String {
    val flavour = GFMFlavourDescriptor()
    val tree = MarkdownParser(flavour).buildMarkdownTreeFromString(markdown)
    return HtmlGenerator(markdown, tree, flavour)
        .generateHtml()
        .removePrefix("<body>")
        .removeSuffix("</body>")
}

val nxlsRoot = "${rootDir}/dist/apps/nxls"

layout.buildDirectory = file("${rootDir}/dist/apps/intellij")

plugins {
    id("dev.nx.gradle.project-graph") version ("0.1.25")
    id("java")
    id("org.jetbrains.intellij.platform") version "2.11.0"
}

group = providers.gradleProperty("pluginGroup").get()

version = providers.gradleProperty("version").get()

val automation by sourceSets.creating
val automationPort =
    providers
        .gradleProperty("automationPort")
        .orElse(providers.environmentVariable("NX_AUTOMATION_PORT"))
        .map(String::toInt)
        .orElse(20000 + (rootDir.absolutePath.hashCode().toUInt() % 20000u).toInt())
val automationOutput =
    providers
        .environmentVariable("NX_AUTOMATION_OUTPUT")
        .map { rootProject.file(it) }
        .orElse(layout.buildDirectory.dir("automation").map { it.asFile })
val automationDriverVersion = providers.provider { intellijPlatform.productInfo.buildNumber }

dependencies {
    listOf("driver-sdk", "driver-model").forEach { artifact ->
        add(
            automation.implementationConfigurationName,
            automationDriverVersion.map { "com.jetbrains.intellij.driver:$artifact:$it" },
        )
    }
}

intellijPlatformTesting {
    runIde {
        create("runAutomationIde") {
            localPath = layout.dir(providers.provider { intellijPlatform.platformPath.toFile() })
            sandboxDirectory =
                layout.dir(
                    providers
                        .environmentVariable("NX_AUTOMATION_SANDBOX")
                        .map { rootProject.file(it) }
                        .orElse(layout.buildDirectory.dir("automation-sandbox").map { it.asFile })
                )
            prepareSandboxTask {
                from(nxlsRoot) { into("${intellijPlatform.projectName.get()}/nxls") }
            }
            task {
                environment = environment.filterKeys { it != "CI" && it != "NX_DAEMON" }
                systemProperty(
                    "nx.console.automation.runId",
                    providers.environmentVariable("NX_AUTOMATION_RUN_ID").orElse("").get(),
                )
                systemProperty("com.sun.management.jmxremote", "true")
                systemProperty("com.sun.management.jmxremote.host", "127.0.0.1")
                systemProperty("com.sun.management.jmxremote.port", automationPort.get())
                systemProperty("com.sun.management.jmxremote.rmi.port", automationPort.get())
                systemProperty("com.sun.management.jmxremote.authenticate", "false")
                systemProperty("com.sun.management.jmxremote.ssl", "false")
                systemProperty(
                    "com.sun.management.jmxremote.serial.filter.pattern",
                    "java.**;javax.**;com.intellij.driver.model.**",
                )
                systemProperty("java.rmi.server.hostname", "127.0.0.1")
                systemProperty("nx.console.automation.workspace", rootDir.absolutePath)
                systemProperty("expose.ui.hierarchy.url", "true")
                systemProperty("idea.trust.all.projects", "true")
                systemProperty("idea.is.integration.test", "true")
                // IntelliJ recognizes this test policy version without a first-run dialog.
                systemProperty("jb.privacy.policy.text", "<!--999.999-->")
                systemProperty("jb.consents.confirmation.enabled", "false")
                systemProperty("ide.show.tips.on.startup.default.value", "false")
                args(
                    providers
                        .gradleProperty("automationProject")
                        .orElse(providers.environmentVariable("NX_AUTOMATION_PROJECT"))
                        .orElse(rootDir.absolutePath)
                        .get()
                )
                doFirst {
                    logger.lifecycle("Automation JMX endpoint: 127.0.0.1:${automationPort.get()}")
                }
            }
        }
    }
}

tasks.register<JavaExec>("runAutomation") {
    group = "verification"
    description = "Runs a Kotlin scenario against this worktree's automation IDE."
    classpath = automation.runtimeClasspath
    mainClass =
        providers.gradleProperty("automationMain").orElse("dev.nx.console.automation.InspectIdeKt")
    systemProperty("nx.console.automation.port", automationPort.get())
    systemProperty("nx.console.automation.workspace", rootDir.absolutePath)
    systemProperty("nx.console.automation.output", automationOutput.get().absolutePath)
    workingDir = rootDir
    maxHeapSize = "1g"
}

tasks.register("prepareAutomationClient") {
    group = "verification"
    description = "Builds the Kotlin client and exports its Java runtime for the e2e runner."
    dependsOn(automation.classesTaskName)
    val classpathFile = automationOutput.map { it.resolve("automation-classpath.txt") }
    val javaFile = automationOutput.map { it.resolve("automation-java.txt") }
    outputs.files(classpathFile, javaFile)
    doLast {
        classpathFile.get().parentFile.mkdirs()
        classpathFile.get().writeText(automation.runtimeClasspath.asPath)
        val launcher = tasks.named<JavaExec>("runAutomation").get().javaLauncher.get()
        javaFile.get().writeText(launcher.executablePath.asFile.absolutePath)
    }
}

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
                version = "2026.2.2"
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

tasks.withType<KotlinCompile> {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_21)
        freeCompilerArgs.add("-Xskip-metadata-version-check")
    }
}

tasks {
    prepareSandbox() {
        from(nxlsRoot) {
            include("**")
            include("**/**")
            into(intellijPlatform.projectName.map { "$it/nxls" }.get())
        }
    }

    jar {
        dependsOn("copyGenerateUiV2Artifacts", "copyCloudFixWebviewArtifacts")
        archiveBaseName.set("nx-console")
    }

    withType<RunIdeTask> {
        maxHeapSize =
            if (name == "runAutomationIde") {
                providers.environmentVariable("NX_AUTOMATION_IDE_HEAP").orElse("2g").get()
            } else "6g"
    }

    test {
        useJUnit()
        include("**/*Test.class")
        // Turn a hung test IDE into a failure with captured output instead of a silent CI timeout.
        timeout.set(Duration.ofMinutes(20))

        testLogging {
            events("started", "passed", "skipped", "failed", "standardOut", "standardError")
            showExceptions = true
            showStackTraces = true
            showCauses = true
            exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
        }
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
