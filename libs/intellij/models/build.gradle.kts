plugins { id("java-library") }

group = providers.gradleProperty("pluginGroup").get()

version = providers.gradleProperty("version").get()

// Configure project's dependencies
repositories { mavenCentral() }

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")
    implementation("com.google.code.gson:gson:2.10.1")
    implementation("org.semver4j:semver4j:6.0.0")
}

ktfmt { kotlinLangStyle() }

kotlin { jvmToolchain(21) }
