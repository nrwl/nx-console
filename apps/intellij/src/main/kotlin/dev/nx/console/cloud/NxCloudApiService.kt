package dev.nx.console.cloud

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import dev.nx.console.nxls.NxlsService
import io.ktor.client.*
import io.ktor.client.engine.okhttp.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Service(Service.Level.PROJECT)
class NxCloudApiService(private val project: Project) {

    companion object {
        fun getInstance(project: Project): NxCloudApiService =
            project.getService(NxCloudApiService::class.java)

        private const val DEFAULT_CLOUD_URL = "https://cloud.nx.app"
    }

    private val logger = thisLogger()
    private val httpClient = HttpClient(OkHttp)
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    @Serializable data class UpdateSuggestedFixRequest(val aiFixId: String, val action: String)

    suspend fun updateSuggestedFix(
        aiFixId: String,
        action: String // "APPLIED", "REJECTED", or "APPLIED_LOCALLY"
    ): Boolean {
        logger.info("Starting updateSuggestedFix: aiFixId=$aiFixId, action=$action")
        try {
            val cloudStatus = NxlsService.getInstance(project).cloudStatus()
            logger.info("Cloud status retrieved: $cloudStatus")
            val nxCloudUrl = cloudStatus?.nxCloudUrl ?: DEFAULT_CLOUD_URL

            if (cloudStatus?.isConnected != true) {
                logger.warn("Nx Cloud is not connected. Status: $cloudStatus")
                return false
            }

            val authHeaders = NxlsService.getInstance(project).cloudAuthHeaders()
            logger.info(
                "Auth headers retrieved: ${authHeaders?.let { "Headers present" } ?: "null"}"
            )
            logger.info("Auth headers object: $authHeaders")
            if (authHeaders == null) {
                logger.warn("Failed to get Nx Cloud auth headers")
                return false
            }

            logger.info("Sending request to: $nxCloudUrl/nx-cloud/update-suggested-fix")
            logger.info(
                "Request headers - Nx-Cloud-Id: ${authHeaders.nxCloudId}, " +
                    "Nx-Cloud-Personal-Access-Token: ${authHeaders.nxCloudPersonalAccessToken?.let { "***" }}, " +
                    "Authorization: ${authHeaders.authorization?.let { "***" }}"
            )

            val response =
                httpClient.post("$nxCloudUrl/nx-cloud/update-suggested-fix") {
                    contentType(ContentType.Application.Json)
                    authHeaders.nxCloudId?.let { header("Nx-Cloud-Id", it) }
                    authHeaders.nxCloudPersonalAccessToken?.let {
                        header("Nx-Cloud-Personal-Access-Token", it)
                    }
                    authHeaders.authorization?.let { header("Authorization", it) }
                    setBody(json.encodeToString(UpdateSuggestedFixRequest(aiFixId, action)))
                }

            logger.info(
                "Update suggested fix response: status=${response.status}, success=${response.status.isSuccess()}"
            )

            if (response.status.value == 401) {
                logger.error("Authentication failed (401). Please check your Nx Cloud credentials.")
                logger.error("Response body: ${response.bodyAsText()}")
            }

            return response.status.isSuccess()
        } catch (e: Exception) {
            logger.error("Failed to update suggested fix", e)
            return false
        }
    }
}
