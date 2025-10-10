package dev.nx.console.utils

import com.google.gson.JsonParser
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.util.ExecUtil
import com.intellij.openapi.util.SystemInfo
import java.net.HttpURLConnection
import java.net.URL
import java.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout

object NxProvenance {

    suspend fun nxLatestProvenanceCheck(workspaceRoot: String): Pair<Boolean, String?> {
        return try {
            withContext(Dispatchers.IO) {
                // Check for NX_SKIP_PROVENANCE_CHECK in environment or .env file
                val skipCheck =
                    System.getenv("NX_SKIP_PROVENANCE_CHECK")
                        ?: loadEnvFile("$workspaceRoot/.env")["NX_SKIP_PROVENANCE_CHECK"]

                if (skipCheck?.lowercase() in listOf("true", "1", "yes")) {
                    return@withContext Pair(true, null)
                }
                // Get npm view data
                val command =
                    GeneralCommandLine().apply {
                        exePath = if (SystemInfo.isWindows) "npm.cmd" else "npm"
                        addParameters("view", "nx@latest", "--json", "--silent")
                        charset = Charsets.UTF_8
                    }

                val result = ExecUtil.execAndGetOutput(command)
                val npmViewJson = JsonParser.parseString(result.stdout.trim())

                if (!npmViewJson.isJsonObject) {
                    return@withContext Pair(false, "Invalid npm view response")
                }

                val npmViewResult = npmViewJson.asJsonObject
                val dist = npmViewResult.getAsJsonObject("dist")
                val attestations = dist?.getAsJsonObject("attestations")
                val attURL = attestations?.get("url")?.asString

                if (attURL == null) {
                    return@withContext Pair(false, "No attestation URL found")
                }

                // Fetch attestations with timeout
                val attestationsJson =
                    withTimeout(10000) {
                        val url = URL(attURL)
                        val connection = url.openConnection() as HttpURLConnection
                        connection.requestMethod = "GET"
                        connection.connectTimeout = 10000
                        connection.readTimeout = 10000

                        try {
                            val responseCode = connection.responseCode
                            if (responseCode == HttpURLConnection.HTTP_OK) {
                                connection.inputStream.bufferedReader().use { it.readText() }
                            } else {
                                throw Exception("HTTP error code: $responseCode")
                            }
                        } finally {
                            connection.disconnect()
                        }
                    }

                val attestationsData = JsonParser.parseString(attestationsJson)
                val attestationsList = attestationsData.asJsonObject.getAsJsonArray("attestations")

                val provenanceAttestation =
                    attestationsList
                        ?.firstOrNull { attestation ->
                            attestation.asJsonObject.get("predicateType")?.asString ==
                                "https://slsa.dev/provenance/v1"
                        }
                        ?.asJsonObject

                if (provenanceAttestation == null) {
                    return@withContext Pair(false, "No provenance attestation found")
                }

                // Parse DSSE envelope
                val bundle = provenanceAttestation.getAsJsonObject("bundle")
                val dsseEnvelope = bundle.getAsJsonObject("dsseEnvelope")
                val payloadBase64 = dsseEnvelope.get("payload").asString
                val payloadBytes = Base64.getDecoder().decode(payloadBase64)
                val payloadJson = String(payloadBytes)
                val dsseEnvelopePayload = JsonParser.parseString(payloadJson).asJsonObject

                // Check workflow parameters
                val predicate = dsseEnvelopePayload.getAsJsonObject("predicate")
                val buildDefinition = predicate?.getAsJsonObject("buildDefinition")
                val externalParameters = buildDefinition?.getAsJsonObject("externalParameters")
                val workflowParameters = externalParameters?.getAsJsonObject("workflow")

                val repository = workflowParameters?.get("repository")?.asString
                if (repository != "https://github.com/nrwl/nx") {
                    return@withContext Pair(false, "Repository does not match nrwl/nx")
                }

                val path = workflowParameters.get("path")?.asString
                if (path != ".github/workflows/publish.yml") {
                    return@withContext Pair(
                        false,
                        "Publishing workflow does not match .github/workflows/publish.yml",
                    )
                }

                val version = npmViewResult.get("version")?.asString
                val ref = workflowParameters.get("ref")?.asString
                if (ref != "refs/tags/$version") {
                    return@withContext Pair(false, "Version ref does not match refs/tags/$version")
                }

                // Verify integrity hash
                val integrity = dist.get("integrity")?.asString
                if (integrity != null && integrity.startsWith("sha512-")) {
                    val distShaBase64 = integrity.substring(7)
                    val distShaBytes = Base64.getDecoder().decode(distShaBase64)
                    val distSha = distShaBytes.joinToString("") { "%02x".format(it) }

                    val subjects = dsseEnvelopePayload.getAsJsonArray("subject")
                    val firstSubject = subjects?.get(0)?.asJsonObject
                    val digest = firstSubject?.getAsJsonObject("digest")
                    val attestationSha = digest?.get("sha512")?.asString

                    if (distSha != attestationSha) {
                        return@withContext Pair(
                            false,
                            "Integrity hash does not match attestation hash",
                        )
                    }
                }

                Pair(true, null)
            }
        } catch (e: Exception) {
            Pair(false, "Error checking provenance: ${e.message}")
        }
    }

    const val NO_PROVENANCE_ERROR =
        "An error occurred while checking the integrity of the latest version of Nx. This shouldn't happen. Please file an issue at https://github.com/nrwl/nx-console/issues"

    // Simple .env file parser - basic workaround to avoid external dependencies
    // Handles common cases but skips advanced features like variable expansion
    private fun parseEnvFile(file: java.io.File): Map<String, String> {
        val env = mutableMapOf<String, String>()

        file.forEachLine { line ->
            val trimmed = line.trim()

            if (trimmed.isEmpty() || trimmed.startsWith("#")) return@forEachLine

            val separatorIndex = trimmed.indexOf('=')
            if (separatorIndex == -1) return@forEachLine

            val key = trimmed.substring(0, separatorIndex).trim()
            var value = trimmed.substring(separatorIndex + 1).trim()

            if (value.length >= 2) {
                if (
                    (value.startsWith("\"") && value.endsWith("\"")) ||
                        (value.startsWith("'") && value.endsWith("'"))
                ) {
                    value = value.substring(1, value.length - 1)
                }
            }

            env[key] = value
        }

        return env
    }

    fun loadEnvFile(filePath: String): Map<String, String> {
        val file = java.io.File(filePath)
        return if (file.exists() && file.isFile) {
            parseEnvFile(file)
        } else {
            emptyMap()
        }
    }
}
