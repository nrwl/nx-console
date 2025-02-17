plugins {
  // Kotlin support
  id("org.jetbrains.kotlin.jvm") version "2.0.20"
  // Kotlin serialization
  id("org.jetbrains.kotlin.plugin.serialization") version "2.0.20"
  // Gradle IntelliJ Platform Plugin
  id("org.jetbrains.intellij.platform") version "2.1.0"
}

group = "dev.nx.console"

// Configure project's dependencies
repositories {
  mavenCentral()

  intellijPlatform { defaultRepositories() }
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

  implementation("io.github.nsk90:kstatemachine:0.31.0")
  implementation("io.github.nsk90:kstatemachine-coroutines:0.31.0")

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
  implementation(project(":libs:intellij:console_bundle"))
  implementation(project(":libs:intellij:icons"))
  implementation(project(":libs:intellij:models"))
  implementation(project(":libs:intellij:nxls"))
}

ktfmt { kotlinLangStyle() }

kotlin { jvmToolchain(21) }
