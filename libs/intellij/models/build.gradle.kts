plugins {
    // Java support
    id("java-library")
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
    implementation("com.google.code.gson:gson:2.10.1")

    intellijPlatform {
      val type = providers.gradleProperty("platformType")
      val version = providers.gradleProperty("platformVersion")
      create(type, version) {
        useCache = true
      }
    }
}

ktfmt { kotlinLangStyle() }
kotlin { jvmToolchain(21) }
