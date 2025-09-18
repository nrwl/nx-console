plugins {
    // Java support
    id("java-library")
    id("org.jetbrains.kotlin.jvm") version "2.2.0"

    // Kotlin serialization
    id("org.jetbrains.kotlin.plugin.serialization") version "2.2.0"
    // Gradle IntelliJ Platform Plugin
    id("org.jetbrains.intellij.platform.module")
}

group = providers.gradleProperty("pluginGroup").get()

version = providers.gradleProperty("version").get()

// Configure project's dependencies
repositories {
    mavenLocal()
    mavenCentral()
    gradlePluginPortal()

    intellijPlatform { defaultRepositories() }
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")
    intellijPlatform {
        val type = providers.gradleProperty("platformType")
        val version = providers.gradleProperty("platformVersion")
        create(type, version) {
          useCache = true
        }

        bundledPlugins(
            providers.gradleProperty("platformPlugins").map { plugins ->
                plugins.split(',').map(String::trim).filter(String::isNotEmpty)
            }
        )
        pluginVerifier()
        zipSigner()
    }
}

ktfmt { kotlinLangStyle() }

kotlin { jvmToolchain(21) }
