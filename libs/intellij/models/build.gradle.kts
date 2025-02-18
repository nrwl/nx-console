plugins {
    // Java support
    id("java-library")
    // Kotlin serialization
    id("org.jetbrains.kotlin.plugin.serialization") version "2.0.20"
    // Gradle IntelliJ Platform Plugin
    id("org.jetbrains.intellij.platform.module")
}

group = providers.gradleProperty("pluginGroup").get()

version = providers.gradleProperty("version").get()

// Configure project's dependencies
repositories {
    mavenCentral()

    intellijPlatform { defaultRepositories() }
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.2")
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

kotlin { jvmToolchain(21) }